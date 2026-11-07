
import asyncio
import os
import sys
import uuid
from datetime import timedelta
from pathlib import Path

from aiohttp import web
from dotenv import load_dotenv
from livekit import api


BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")

AGENT_NAME = "avatar-demo"

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")


def check_environment():

    required = {
        "LIVEKIT_URL": LIVEKIT_URL,
        "LIVEKIT_API_KEY": LIVEKIT_API_KEY,
        "LIVEKIT_API_SECRET": LIVEKIT_API_SECRET,
    }

    missing = [
        name for name, value in required.items()
        if not value
    ]

    if missing:
        raise RuntimeError(
            "Missing environment variables: "
            + ", ".join(missing)
        )


def memory_report():

    try:
        import psutil

        process = psutil.Process(os.getpid())

        print(
            f"Web server RSS: "
            f"{process.memory_info().rss / 1024 / 1024:.1f} MB"
        )

        for child in process.children(recursive=True):

            try:
                print(
                    f"Child PID {child.pid} RSS: "
                    f"{child.memory_info().rss / 1024 / 1024:.1f} MB"
                )
            except psutil.Error:
                pass

    except ImportError:
        print("Install psutil to enable memory reporting.")


async def start_agent(app):

    agent_file = BASE_DIR / "agent.py"

    process = await asyncio.create_subprocess_exec(
        sys.executable,
        str(agent_file),
        "start",
        cwd=str(BASE_DIR),
        env=os.environ.copy(),
    )

    app["agent_process"] = process

    print("Agent process launched:", process.pid)

    memory_report()


async def stop_agent(app):

    process = app.get("agent_process")

    if process is None:
        return

    if process.returncode is None:

        print("Stopping agent process...")

        process.terminate()

        try:
            await asyncio.wait_for(
                process.wait(),
                timeout=10,
            )

        except asyncio.TimeoutError:

            process.kill()
            await process.wait()

    print("Agent process stopped.")


async def token(request):

    try:

        room = f"avatar-demo-{uuid.uuid4().hex[:8]}"

        jwt = (
            api.AccessToken(
                LIVEKIT_API_KEY,
                LIVEKIT_API_SECRET,
            )
            .with_identity(
                f"user-{uuid.uuid4().hex[:8]}"
            )
            .with_ttl(
                timedelta(minutes=15)
            )
            .with_grants(
                api.VideoGrants(
                    room_join=True,
                    room=room,
                )
            )
            .with_room_config(
                api.RoomConfiguration(
                    sync_streams=True,
                    agents=[
                        api.RoomAgentDispatch(
                            agent_name=AGENT_NAME
                        )
                    ],
                )
            )
            .to_jwt()
        )

        return web.json_response({
            "url": LIVEKIT_URL,
            "token": jwt,
        })

    except Exception as error:

        print("Token generation failed:", repr(error))

        return web.json_response(
            {"error": "Token generation failed"},
            status=500,
        )


async def index(request):

    return web.FileResponse(
        BASE_DIR / "index.html",
        headers={
            "Cache-Control": "no-store",
        },
    )


def create_app():

    check_environment()

    app = web.Application()

    app.on_startup.append(start_agent)
    app.on_cleanup.append(stop_agent)

    app.router.add_get("/", index)
    app.router.add_get("/token", token)

    app.router.add_static(
        "/static",
        BASE_DIR / "static",
    )

    return app


if __name__ == "__main__":

    web.run_app(
        create_app(),
        host="0.0.0.0",
        port=int(os.getenv("PORT", "10000")),
    )
