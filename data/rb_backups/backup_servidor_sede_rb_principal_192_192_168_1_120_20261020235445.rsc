# ==============================================================================
# MIKROTIK ROUTEROS CONFIGURATION SNAPSHOT (.rsc) - BASE DE DADOS AGROISP
# Concentrador: Servidor Sede (RB Principal 192.168.1.120) (192.168.1.120:8728)
# Status: Capturado a partir do cache e registros locais do AgroISP (Timeout de comunicação com MikroTik (192.168.1.120:8728))
# Data do Snapshot: 2026-10-20T23:54:45.432Z
# ==============================================================================

/system identity
set name="Servidor Sede (RB Principal 192.168.1.120)"

/ppp profile
add name="prof_15m_padrao" rate-limit="5M/15M" comment="Plano Start 15M (Wireless 5.8GHz)"
add name="prof_30m_ultra" rate-limit="10M/30M" comment="Plano Turbo 30M (Wireless 5.8GHz)"
add name="prof_60m_plus" rate-limit="20M/60M" comment="Plano Plus 60M (Wireless AC)"
add name="prof_150m_fibra" rate-limit="50M/150M" comment="Fibra Óptica 150M Full Duplex"
add name="prof_300m_corp" rate-limit="100M/300M" comment="Fibra Óptica 300M Gamer & Home Office"
add name="prof_corte_bloqueado" rate-limit="128k/128k" comment="Perfil Corte Inadimplentes"

/ppp secret

/queue simple

# Fim do Snapshot