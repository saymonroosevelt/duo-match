import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

// Carrega os matches do usuário, os perfis das outras pessoas e a última
// mensagem de cada conversa. Também separa as curtidas recebidas.
export default function useMatches() {
  const [state, setState] = useState({
    userId: null,
    matches: [],
    likes: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setState({
        userId: null,
        matches: [],
        likes: [],
        loading: false,
        error: null,
      });
      return;
    }

    const { data: rows, error } = await supabase
      .from('matches')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      setState({
        userId: user.id,
        matches: [],
        likes: [],
        loading: false,
        error: error.message,
      });
      return;
    }

    const matchedRows = (rows || []).filter((row) => row.status === 'matched');
    const likeRows = (rows || []).filter(
      (row) => row.status === 'pending' && row.receiver_id === user.id,
    );

    const otherIds = [
      ...new Set(
        [...matchedRows, ...likeRows].map((row) =>
          row.sender_id === user.id ? row.receiver_id : row.sender_id,
        ),
      ),
    ].filter(Boolean);

    let profiles = [];
    if (otherIds.length > 0) {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('*')
        .in('id', otherIds);
      profiles = profileRows || [];
    }

    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const matchIds = matchedRows.map((row) => row.id);

    const lastByMatch = {};
    if (matchIds.length > 0) {
      const { data: messageRows } = await supabase
        .from('messages')
        .select('id,match_id,sender_id,content,created_at')
        .in('match_id', matchIds)
        .order('created_at', { ascending: false });

      for (const message of messageRows || []) {
        if (!lastByMatch[message.match_id]) {
          lastByMatch[message.match_id] = message;
        }
      }
    }

    const matches = matchedRows
      .map((row) => {
        const otherId =
          row.sender_id === user.id ? row.receiver_id : row.sender_id;
        const otherUser = profileMap.get(otherId);
        if (!otherUser) return null;
        return {
          id: row.id,
          otherUser,
          lastMessage: lastByMatch[row.id] || null,
          createdAt: row.created_at,
        };
      })
      .filter(Boolean);

    const likes = likeRows
      .map((row) => {
        const otherUser = profileMap.get(row.sender_id);
        if (!otherUser) return null;
        return {
          matchId: row.id,
          otherUser,
          createdAt: row.created_at,
        };
      })
      .filter(Boolean);

    setState({
      userId: user.id,
      matches,
      likes,
      loading: false,
      error: null,
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
