-- ============================================================
-- BLACKOUT MOTOS - Aceitar video na galeria da moto
-- ============================================================
--
-- No TikTok, foto quase nao roda: quem entrega e video. Entao
-- a galeria da moto passa a receber video tambem, e e dele que
-- sai o post.
--
-- Video de celular e pesado - 30 segundos em 1080p passam
-- facil de 50 MB, que e o teto padrao do balde. Aqui o limite
-- sobe para 200 MB, com folga para um clipe curto sem a loja
-- precisar comprimir nada antes.
--
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- Pode rodar mais de uma vez sem quebrar nada.
-- ============================================================


-- ------------------------------------------------------------
-- 1. LIMITE E TIPOS ACEITOS
--
-- A lista de tipos vem nula de proposito: nulo significa "o
-- balde aceita qualquer tipo". Limitar aqui so criaria um
-- segundo lugar para dar erro - a tela ja filtra o que oferece.
-- ------------------------------------------------------------

update storage.buckets
set
  file_size_limit = 209715200,   -- 200 MB
  allowed_mime_types = null,
  public = true
where id = 'fotos-motos';


-- ------------------------------------------------------------
-- 2. CONFERÊNCIA
--
-- limite_mb deve mostrar 200.
-- ------------------------------------------------------------

select
  id                                   as balde,
  public                               as publico,
  round(file_size_limit / 1048576.0)   as limite_mb,
  allowed_mime_types                   as tipos
from storage.buckets
where id = 'fotos-motos';
