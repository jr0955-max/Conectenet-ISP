#!/bin/bash
# ==============================================================================
# Script de Provisionamento Automático AgroISP Pro (ISP Billing & MikroTik)
# Compatível com: Debian 11/12, Ubuntu 20.04/22.04/24.04, Proxmox VE (LXC/VM)
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}===================================================================${NC}"
echo -e "${GREEN}   AgroISP Pro - Sistema de Gestão & Billing MikroTik RouterOS   ${NC}"
echo -e "${BLUE}===================================================================${NC}"
echo -e "Iniciando provisionamento automático do ambiente..."
sleep 1

# 1. Verificar privilégios de root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERRO] Por favor, execute este script como root (sudo ./provision.sh)${NC}"
  exit 1
fi

# 2. Atualizar repositórios do sistema
echo -e "\n${YELLOW}[1/5] Atualizando repositórios de pacotes do Linux...${NC}"
apt-get update -y && apt-get install -y curl wget git jq ca-certificates gnupg lsb-release

# 3. Verificar e instalar Docker se não estiver presente
if ! command -v docker &> /dev/null; then
  echo -e "\n${YELLOW}[2/5] Docker não encontrado. Instalando Docker Engine oficial...${NC}"
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  rm -f get-docker.sh
  systemctl enable docker
  systemctl start docker
  echo -e "${GREEN}Docker instalado e iniciado com sucesso!${NC}"
else
  echo -e "\n${GREEN}[2/5] Docker já está instalado no sistema.${NC}"
fi

# 4. Verificar e instalar Docker Compose plugin
if ! docker compose version &> /dev/null; then
  echo -e "\n${YELLOW}[3/5] Instalando Docker Compose plugin...${NC}"
  apt-get install -y docker-compose-plugin
fi

# 5. Criar diretório de dados persistentes
echo -e "\n${YELLOW}[4/5] Configurando estrutura de diretórios e permissões...${NC}"
mkdir -p ./data
chmod 755 ./data

# 6. Build e Inicialização dos Containers via Docker Compose
echo -e "\n${YELLOW}[5/5] Construindo e subindo containers do AgroISP Pro...${NC}"
docker compose down || true
docker compose up -d --build

# 7. Teste de conectividade e status
echo -e "\nAguardando subida da aplicação..."
sleep 5

SERVER_IP=$(hostname -I | awk '{print $1}')
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/stats || true)

if [ "$STATUS_CODE" -eq 200 ]; then
  echo -e "\n${GREEN}===================================================================${NC}"
  echo -e "${GREEN}  ✓ IMPLANTAÇÃO CONCLUÍDA COM SUCESSO!                             ${NC}"
  echo -e "${GREEN}===================================================================${NC}"
  echo -e "Acesse o painel do AgroISP Pro no seu navegador:"
  echo -e "  ➜ Local:    ${BLUE}http://localhost:3000${NC}"
  echo -e "  ➜ Na Rede:  ${BLUE}http://${SERVER_IP}:3000${NC}"
  echo -e "\nComandos úteis:"
  echo -e "  - Ver logs em tempo real:   ${YELLOW}docker compose logs -f${NC}"
  echo -e "  - Reiniciar servidor:       ${YELLOW}docker compose restart${NC}"
  echo -e "  - Parar servidor:           ${YELLOW}docker compose down${NC}"
  echo -e "===================================================================\n"
else
  echo -e "\n${YELLOW}[AVISO] O container subiu. Verifique o status com: docker compose ps${NC}"
fi
