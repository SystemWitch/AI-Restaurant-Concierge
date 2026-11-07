
import asyncio
import json
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv

from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    WorkerOptions,
    cli,
    function_tool,
    inference,
)
from livekit.plugins import openai, silero, synthesia


load_dotenv(Path(__file__).parent / ".env")

AGENT_NAME = "avatar-demo"

AVATAR_ID = os.getenv("SYNTHESIA_AVATAR_ID", "").strip()

if not AVATAR_ID:
    raise RuntimeError("SYNTHESIA_AVATAR_ID is missing.")

OPENROUTER_MODEL = "openrouter/free"

INSTRUCTIONS = """
You are Ava, the maître d' at D.R. Restaurant.

You are a real-time voice assistant. Keep responses short and precise.
Never use markdown, lists, or URLs.

The seven-course tasting menu is $135 per person.
Wine pairings start at $45.

Openers: oysters, focaccia, radishes.
First: beets, squash, crudo, burrata.
Mains: halibut, duck, shortrib, mushroom, celeriac.
Desserts: pavlova, chocolate, sorbet.

Vegan: radishes, beets, mushroom, sorbet.
Vegetarian: focaccia, squash, burrata, celeriac, pavlova, chocolate.
Seafood: oysters, crudo, halibut.

Use your tools while speaking:
- show_section when moving to a new menu section.
- filter_menu when a dietary preference is mentioned or changed.
- focus_dish when describing a dish in detail.
- add_to_order only after the guest chooses a dish.

Ask what the guest is in the mood for.
Offer two options rather than ten.
Mention wine pairings when appropriate.
"""


class MaitreD(Agent):

    def __init__(self, room):
        super().__init__(instructions=INSTRUCTIONS)
        self.room = room

    async def _ui(self, **message):
        payload = json.dumps(message)

        await self.room.local_participant.publish_data(
            payload,
            topic="ui",
        )

        return "Done."

    @function_tool
    async def show_section(self, section: str) -> str:
        """Navigate to a menu section."""
        return await self._ui(
            action="show_section",
            section=section,
        )

    @function_tool
    async def filter_menu(self, diet: str) -> str:
        """Filter dishes by dietary preference."""
        return await self._ui(
            action="filter_menu",
            diet=diet,
        )

    @function_tool
    async def focus_dish(self, dish: str) -> str:
        """Show dish details."""
        return await self._ui(
            action="focus_dish",
            dish=dish,
        )

    @function_tool
    async def add_to_order(self, dish: str) -> str:
        """Add a selected dish to the order."""
        return await self._ui(
            action="add_to_order",
            dish=dish,
        )


def prewarm(proc):
    # Load VAD once per worker process.
    proc.userdata["vad"] = silero.VAD.load()


async def entrypoint(ctx: JobContext):

    session = None
    avatar = None

    try:

        await ctx.connect()

        session = AgentSession(
            vad=ctx.proc.userdata["vad"],

            stt=inference.STT(
                model="cartesia/ink-2",
            ),

            llm=openai.LLM.with_openrouter(
                model=OPENROUTER_MODEL,
                temperature=0.6,
                parallel_tool_calls=False,
                timeout=httpx.Timeout(
                    connect=15.0,
                    read=20.0,
                    write=10.0,
                    pool=10.0,
                ),
            ),

            tts=inference.TTS(
                model="cartesia/sonic-3.6",
                voice="9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
                language="en",
            ),

            turn_handling={
                "turn_detection": "stt",
                "preemptive_generation": {
                    "enabled": False,
                },
            },
        )

        avatar = synthesia.AvatarSession(
            synthesia.AvatarConfig(
                avatar_ids=[AVATAR_ID],
            ),
            join_timeout=60.0,
        )

        # Start avatar before the voice session.
        for attempt in range(3):

            try:
                await avatar.start(
                    session,
                    room=ctx.room,
                )
                break

            except synthesia.SynthesiaError as error:

                if not error.retryable or attempt == 2:
                    raise

                await asyncio.sleep(2)

        await session.start(
            agent=MaitreD(ctx.room),
            room=ctx.room,
        )

        # Await the initial response.
        await session.generate_reply(
            instructions=(
                "Welcome the guest to D.R. Restaurant "
                "in one short sentence."
            )
        )

        # Keep the job alive until LiveKit ends it.
        await ctx.wait_for_disconnect()

    finally:

        # Release session resources when the job ends.
        if session is not None:

            try:
                await session.aclose()
            except Exception as error:
                print("Session cleanup error:", error)

        # Avatar cleanup is handled by the session/plugin lifecycle.
        # Avoid calling undocumented avatar methods here.


if __name__ == "__main__":

    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            agent_name=AGENT_NAME,
            port=8081,
        )
    )
