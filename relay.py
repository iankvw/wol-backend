#!/usr/bin/env python3
import socket
import sys
import argparse

DEFAULT_LISTEN_PORT = 9
DEFAULT_BROADCAST_PORT = 9

def start_relay(listen_port, broadcast_port):
    # UDP 소켓 생성
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

    try:
        # 모든 인터페이스에서 listen_port로 들어오는 UDP 패킷 대기
        sock.bind(('0.0.0.0', listen_port))
        # 소켓에 브로드캐스트 옵션 활성화
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        print(f"[*] WOL Relay Server started. Listening on UDP port {listen_port}...")
    except Exception as e:
        print(f"[-] Binding failed: {e}", file=sys.stderr)
        sys.exit(1)

    while True:
        try:
            data, addr = sock.recvfrom(1024)
            
            # 수신된 데이터에 'FF'가 6번 연속으로 포함되어있는지 검증
            if b'\xff' * 6 in data:
                print(f"[+] Valid magic packet pattern detected from {addr[0]}:{addr[1]}")
                
                # 브로드캐스트 릴레이
                sock.sendto(data, ('<broadcast>', broadcast_port))
                print(f"[->] Successfully broadcasted WOL packet via port {broadcast_port}.\n")
            else:
                print(f"[-] Ignored invalid packet from {addr[0]}:{addr[1]} (Size: {len(data)} bytes)")

        except KeyboardInterrupt:
            print("\n[*] Shutting down WOL Relay Server...")
            break
        except Exception as e:
            print(f"[-] Error occurred: {e}", file=sys.stderr)

    sock.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="WOL Relay Server with custom listen and broadcast port support")

    parser.add_argument(
        "-p", "--port",
        type=int,
        default=DEFAULT_LISTEN_PORT,
        help=f"Listening UDP port (default: {DEFAULT_LISTEN_PORT})"
    )

    parser.add_argument(
        "-b", "--broadcast-port",
        type=int,
        default=DEFAULT_BROADCAST_PORT,
        help=f"Broadcasting UDP port (default: {DEFAULT_BROADCAST_PORT})"
    )

    args = parser.parse_args()

    start_relay(args.port, args.broadcast_port)