# WOL Backend API

지정된 IP 및 MAC 주소로 Wake-on-LAN(WOL) 매직 패킷을 전송하는 단일 목적의 경량 API 서버입니다.

와일드카드 라우팅을 적용하여 어떠한 엔드포인트 경로로 요청이 인입되어도 정상적으로 파라미터를 추출하고 동작합니다.

👉 **[라이브 데모](https://iank.im/wol/)**

## 📌 주요 기능
- **유연한 라우팅:** 리버스 프록시의 경로 설정과 무관하게 동작 (Wildcard Route)
- **트래픽 제어:** 단기(1초 1회) 및 장기(1시간 20회) Rate Limit 적용
- **멀티 아키텍처:** `linux/amd64` (Intel/AMD) 및 `linux/arm64` (ARM) 플랫폼 공식 지원

---

## 📖 API 명세서

엔드포인트 경로는 서버 관리자의 Nginx/Proxy 설정에 따라 자유롭게 지정할 수 있습니다. (예: `/`, `/wol`, `/wol-backend` 등)

### 1. GET (웹 브라우저 및 단축어용)
```text
GET https://your-domain.com/wol-backend?ip=192.168.1.1&mac=AA-BB-CC-DD-EE-FF
```

### 2. POST (시스템 및 프론트엔드 연동용)
```json
POST https://your-domain.com/wol-backend
Content-Type: application/json

{
  "targetIp": "192.168.1.1",
  "macAddress": "AA-BB-CC-DD-EE-FF"
}
```

---

## 🛠 배포 가이드 (Deployment)

GitHub Container Registry (GHCR)를 통해 이미지를 제공하므로 즉시 배포가 가능합니다.

### 1. Docker Compose (`docker-compose.yml`)
```yaml
services:
  wol-backend:
    image: ghcr.io/iankvw/wol-backend
    restart: unless-stopped
```

### 2. Nginx 리버스 프록시 (`nginx.conf`)
```nginx
location /wol {
    proxy_pass http://wol-backend:3000;

    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```