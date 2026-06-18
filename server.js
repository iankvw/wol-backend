const express = require('express');
const wol = require('wake_on_lan');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 3000;

/**
 * 리버스 프록시(Nginx 등) 환경 설정
 * 클라이언트의 실제 IP 주소를 식별하기 위해 프록시 헤더를 신뢰하도록 설정합니다.
 */
app.set('trust proxy', 1);

app.use(express.json());

/**
 * Rate Limit 정책 1: 단기 트래픽 제어
 * 동일 IP 기준 1초당 최대 1회의 요청만 허용합니다.
 */
const tenSecondsLimiter = rateLimit({
    windowMs: 1 * 1000,
    max: 1,
    message: { success: false, message: "잠시 후 다시 시도해주세요." },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate Limit 정책 2: 장기 트래픽 제어
 * 동일 IP 기준 1시간당 최대 20회의 요청만 허용합니다.
 */
const oneHourLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: { success: false, message: "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * API 라우팅 엔드포인트 (/api/v1/wol)
 */
app.use('/', tenSecondsLimiter, oneHourLimiter);

// ============================================================================
// WOL Backend Error Handling & Response Branching
//
// 클라이언트가 API를 직접 호출(POST)하는 경우 표준 JSON 규격을 반환하며,
// 브라우저 바로가기(GET)를 통한 접근 시에는 UI/UX를 고려하여 HTML 렌더링을 제공합니다.
// ============================================================================
const sendMagicPacket = (req, res, targetIp, macAddress, targetPort) => {
    
    // [Helper 함수] 에러 발생 시 HTTP Method에 맞춰 응답을 동적으로 포장
    const sendError = (statusCode, message) => {
        console.error(`[Error] ${message}`);
        
        if (req.method === 'POST') {
            // 웹 UI 요청 시: 모달창 처리를 위한 JSON 반환
            return res.status(statusCode).json({ success: false, message });
        } else {
            // 바로가기(GET) 요청 시: 시각적 피드백을 위한 에러 페이지 렌더링
            const errorHtml = `
                <div style="display:flex; justify-content:center; align-items:center; height:100vh; background-color:#f8f9fa; font-family:sans-serif;">
                    <div style="background:white; padding:40px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.1); text-align:center;">
                        <p style="color:#333; font-size:16px;">${message}</p>
                        <button onclick="window.close(); history.back();" 
                                style="margin-top:20px; padding:10px 20px; border:none; background-color:#A91D3A; color:white; border-radius:6px; cursor:pointer;">
                            확인
                        </button>
                    </div>
                </div>
            `;
            return res.status(statusCode).send(errorHtml);
        }
    };

    // 파라미터 유효성 검사 (Validation)
    if (!macAddress || !targetIp) {
        return sendError(400, "IP 또는 MAC 주소가 누락되었습니다.");
    }

    // UDP Magic Packet 브로드캐스트 수행
    wol.wake(macAddress, { address: targetIp, port: targetPort }, (error) => {
        if (error) {
            return sendError(500, `서버 오류로 전송에 실패했습니다. (${error.message})`);
        }
        console.log(`[Success] Magic Packet 송출 완료 - Target IP: ${targetIp}, MAC: ${macAddress}`);
        
        // 성공 시 정상 응답 분기
        if (req.method === 'POST') {
            return res.status(200).json({ success: true, message: "PC에 신호를 보냈습니다." });
        } else {
            const htmlResponse = `
                <script>
                    window.close();
                    history.back();
                </script>
            `;
            return res.status(200).send(htmlResponse);
        }
    });
};

/**
 * [POST] 웹 브라우저 UI 전용 API 엔드포인트
 */
app.post('/', (req, res) => {
    const { targetIp, macAddress, port } = req.body;
    const targetPort = port ? parseInt(port, 10) : 9;
    sendMagicPacket(req, res, targetIp, macAddress, targetPort);
});

/**
 * [GET] 바로가기 전용 API 엔드포인트
 */
app.get('/', (req, res) => {
    const { ip: targetIp, mac: macAddress, port } = req.query;
    const targetPort = port ? parseInt(port, 10) : 9;
    sendMagicPacket(req, res, targetIp, macAddress, targetPort);
});

/**
 * 서버 인스턴스 가동
 */
app.listen(PORT, () => {
    console.log(`[Info] WOL 서버 가동 완료 - 포트: ${PORT}`);
});
