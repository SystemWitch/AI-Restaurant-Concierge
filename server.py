
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


# Start the LiveKit agent as a child process
async def start_agent(app: web.Application):

    agent_file = BASE_DIR / "agent.py"

    process = await asyncio.create_subprocess_exec(
        sys.executable,
        str(agent_file),
        "start",
        cwd=str(BASE_DIR),
        env=os.environ.copy()
    )

    app["agent_process"] = process

    print("LiveKit agent process started.")


# Stop the agent when the web server shuts down
async def stop_agent(app: web.Application):

    process = app.get("agent_process")

    if process and process.returncode is None:

        print("Stopping LiveKit agent...")

        process.terminate()

        try:
            await asyncio.wait_for(
                process.wait(),
                timeout=10
            )

        except asyncio.TimeoutError:
            process.kill()
            await process.wait()

        print("LiveKit agent stopped.")


# Generate LiveKit access token
async def token(request: web.Request):

    room = f"avatar-demo-{uuid.uuid4().hex[:8]}"

    jwt = (
        api.AccessToken()
        .with_identity(f"user-{uuid.uuid4().hex[:8]}")
        .with_ttl(timedelta(minutes=15))
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room=room
            )
        )
        .with_room_config(
            api.RoomConfiguration(
                sync_streams=True,
                agents=[
                    api.RoomAgentDispatch(
                        agent_name=AGENT_NAME
                    )
                ]
            )
        )
        .to_jwt()
    )

    return web.json_response({
        "url": os.environ["LIVEKIT_URL"],
        "token": jwt
    })


# Serve frontend
async def index(request: web.Request):

    return web.FileResponse(
        BASE_DIR / "index.html",
        headers={"Cache-Control": "no-store"}
    )


# Create application
app = web.Application()

# Start agent when application starts
app.on_startup.append(start_agent)

# Stop agent when application shuts down
app.on_cleanup.append(stop_agent)

# Routes
app.router.add_get("/", index)
app.router.add_get("/token", token)

app.router.add_static(
    "/static",
    BASE_DIR / "static"
)


if __name__ == "__main__":

    web.run_app(
        app,
        host="0.0.0.0",
        port=int(os.getenv("PORT", "10000"))
    )
