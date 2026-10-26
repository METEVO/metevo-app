#!/usr/bin/env python3
"""LAN entry point for the regtest node APIs.

Docker's published ports do not receive inbound LAN traffic under WSL
mirrored networking (the phone's SYN reaches WSL but docker's DNAT path
never answers), while plain WSL listener sockets are delivered fine.
This proxy therefore listens on plain 0.0.0.0 sockets - the ports the
phones point at - and forwards each connection to the docker-published
loopback port of the matching node.

usage: python3 lan_proxy.py            # 3101 -> 3111 (alice), 3102 -> 3112 (bob)
"""

import socket
import threading

FORWARDS = {
    3101: 3111,  # alice
    3102: 3112,  # bob
}


def pipe(src: socket.socket, dst: socket.socket) -> None:
    first = True
    try:
        while chunk := src.recv(65536):
            if first:
                print(f"relayed {len(chunk)}B {src.getpeername()} -> {dst.getpeername()}", flush=True)
                first = False
            dst.sendall(chunk)
    except OSError as exc:
        print(f"pipe error {src.getpeername()}: {exc}", flush=True)
    finally:
        try:
            dst.shutdown(socket.SHUT_WR)
        except OSError:
            pass


def handle(client: socket.socket, upstream: tuple[str, int]) -> None:
    print(f"accepted {client.getpeername()} -> {upstream}", flush=True)
    try:
        node = socket.create_connection(upstream, timeout=5)
    except OSError as exc:
        print(f"upstream dial failed: {exc}", flush=True)
        client.close()
        return
    threading.Thread(target=pipe, args=(client, node), daemon=True).start()
    try:
        pipe(node, client)
    finally:
        node.close()
        client.close()


def serve(lan_port: int, node_port: int) -> None:
    listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    listener.bind(("0.0.0.0", lan_port))
    listener.listen(64)
    print(f"proxying 0.0.0.0:{lan_port} -> 127.0.0.1:{node_port}", flush=True)
    while True:
        client, _addr = listener.accept()
        threading.Thread(
            target=handle, args=(client, ("127.0.0.1", node_port)), daemon=True
        ).start()


def main() -> None:
    threads = [
        threading.Thread(target=serve, args=(lan, node), daemon=True)
        for lan, node in FORWARDS.items()
    ]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()


if __name__ == "__main__":
    main()
