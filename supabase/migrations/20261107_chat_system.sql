-- 1. Criação da tabela de mensagens
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Habilitar RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança (só quem está no match vê as mensagens)
CREATE POLICY "Users can view messages of their matches" ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM matches 
    WHERE matches.id = messages.match_id 
    AND (auth.uid() = sender_id OR auth.uid() = receiver_id)
  )
);

CREATE POLICY "Users can insert messages in their matches" ON messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM matches 
    WHERE matches.id = messages.match_id 
    AND (auth.uid() = sender_id OR auth.uid() = receiver_id)
  )
);
