"""A maître d' with a face, living on a restaurant website.

The pipeline:
    mic -> VAD -> STT -> turn detection -> LLM (+ tools) -> TTS -> Synthesia avatar -> browser

Run:  python agent.py dev      (terminal 1)
      python server.py         (terminal 2, then open http://localhost:8080)
"""

import asyncio
import json
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv
from livekit.agents import Agent, AgentSession, JobContext, WorkerOptions, cli, function_tool, inference
from livekit.plugins import openai, silero, synthesia

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

AGENT_NAME = "avatar-demo"  # must match server.py
# Must be an Interactive ID from your Synthesia workspace (starts with "av_"),
# not a Studio/stock avatar ID. In Studio: avatar's ••• menu -> Copy Interactive ID.
AVATAR_ID = os.getenv("SYNTHESIA_AVATAR_ID", "").strip()
if not AVATAR_ID:
    raise RuntimeError(
        "SYNTHESIA_AVATAR_ID is required. In Synthesia Studio, open the avatar's "
        "••• menu, choose 'Copy Interactive ID', and put it in .env."
    )
VOICE_ID = "1b285a84-a663-437d-8033-ea6fe737d3d0"  # Cartesia "Skylar"

# The LLM runs on OpenRouter only. This is a free, fast, tool-capable model.
# Free models are rate limited, so keep conversations short (see README).
OPENROUTER_MODEL = "openrouter/free"

# The avatar's knowledge: just a prompt. No database, no RAG.
INSTRUCTIONS = """\
You are Ava, the maître d' at D.R. Restaurant, a made-up twenty-two seat tasting menu
restaurant. You are a real-time avatar in a spoken conversation, so answer must be short and precise1````````````````````````` and never use markdown, lists, or URLs.

The seven course tasting menu is $135 a person, with a full vegan version and
wine pairings from $45. A la carte, using the IDs your tools take:

  openers   oysters $18 · focaccia $9 · radishes $12
  first     beets $16 · squash $17 · crudo $22 · burrata $19
  mains     halibut $38 · duck $42 · shortrib $46 · mushroom $32 · celeriac $30
  desserts  pavlova $14 · chocolate $15 · sorbet $11

  vegan: radishes, beets, mushroom, sorbet
  vegetarian: focaccia, squash, burrata, celeriac, pavlova, chocolate
  seafood: oysters, crudo, halibut
  contains gluten: focaccia, burrata, mushroom

Say the dish names out loud, never the IDs or the prices as digits. Use your
tools while you talk, not instead of talking:

- show_section when you move the guest to a new part of the menu
- filter_menu the moment they mention a dietary need, and again if they change it
- focus_dish when you describe one dish in any detail
- add_to_order only once they have actually chosen something

Work like a real maître d': ask what they are in the mood for, offer two options
rather than ten, and mention the wine pairing when it fits."""


class MaitreD(Agent):
    def __init__(self, room) -> None:
        super().__init__(instructions=INSTRUCTIONS)
        self.room = room

    async def _ui(self, **message) -> str:
        """Send a tiny message to the browser. static/site.js does the rest."""
        await self.room.local_participant.publish_data(json.dumps(message), topic="ui")
        return "Done."

    @function_tool
    async def show_section(self, section: str) -> str:
        """Scroll the page to a part of the menu and highlight it.

        Args:
            section: One of: tasting, openers, first, mains, desserts, wine, room, reserve.
        """
        return await self._ui(action="show_section", section=section)

    @function_tool
    async def filter_menu(self, diet: str) -> str:
        """Grey out every dish on the page the guest cannot eat.

        Args:
            diet: One of: none, vegetarian, vegan, pescatarian, gluten_free.
        """
        return await self._ui(action="filter_menu", diet=diet)

    @function_tool
    async def focus_dish(self, dish: str) -> str:
        """Open the detail card for one dish: allergens and its wine pairing.

        Args:
            dish: A dish ID from the menu, for example halibut or celeriac.
        """
        return await self._ui(action="focus_dish", dish=dish)

    @function_tool
    async def add_to_order(self, dish: str) -> str:
        """Add a dish to the guest's order, shown as a running tab on the page.

        Args:
            dish: A dish ID from the menu.
        """
        return await self._ui(action="add_to_order", dish=dish)


def prewarm(proc) -> None:
    proc.userdata["vad"] = silero.VAD.load()


async def entrypoint(ctx: JobContext) -> None:
    await ctx.connect()

    # The brain: each line is one piece of the pipeline.
    session = AgentSession(
        vad=ctx.proc.userdata["vad"],                                   # is someone talking?
        stt=inference.STT(model="cartesia/ink-2"),                      # speech -> text
        llm=openai.LLM.with_openrouter(                                 # text -> reply, OpenRouter only
            model=OPENROUTER_MODEL,
            temperature=0.6,
            parallel_tool_calls=False,  # UI actions should happen in order
            # Free models can queue; the plugin's default read timeout is 5s.
            timeout=httpx.Timeout(connect=15.0, read=20.0, write=10.0, pool=10.0),
        ),
        tts=inference.TTS(
            model="cartesia/sonic-3.6",
            voice="9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
            language="en",
        ),  # reply -> speech
        turn_handling={
            "turn_detection": "stt",                        # have they finished their thought?
            "preemptive_generation": {"enabled": False},    # keep off when using tools
        },
    )

    # The face: this is the whole Synthesia integration. Start it BEFORE session.start().
    avatar = synthesia.AvatarSession(
        synthesia.AvatarConfig(avatar_ids=[AVATAR_ID]),
        join_timeout=60.0,
    )
    for attempt in range(3):  # cold starts occasionally time out, so retry
        try:
            await avatar.start(session, room=ctx.room)
            break
        except synthesia.SynthesiaError as e:
            if not e.retryable or attempt == 2:
                raise
            await asyncio.sleep(2)

    await session.start(agent=MaitreD(ctx.room), room=ctx.room)
    session.generate_reply(instructions="Welcome the guest to D.R. Restaurant in one short sentence.")


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint, prewarm_fnc=prewarm, agent_name=AGENT_NAME, port=8081))
