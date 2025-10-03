from elevenlabs.client import ElevenLabs
from elevenlabs.play import play


client = ElevenLabs(
    api_key="sk_c968c5fa1d455389c2940c54bc99a45678d10271b0dda582"
)

audio = client.text_to_speech.convert(
    text="The first move is what sets everything in motion.",
    voice_id="xBQhWSfOLmqtKUe8AGj8",
    model_id="eleven_multilingual_v2",
    output_format="mp3_44100_128",
)

play(audio) 