import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const audio = formData.get("audio") as Blob;

        if (!audio) {
            return NextResponse.json({ error: "No audio" }, { status: 400 });
        }

        // Create FormData for Sarvam AI API
        const sarvamFormData = new FormData();
        sarvamFormData.append("file", audio, "recording.webm");
        sarvamFormData.append("language_code", "en-IN");
        sarvamFormData.append("model", "saaras:v2");

        // Call Sarvam AI API directly
        const response = await fetch("https://api.sarvam.ai/speech-to-text-translate", {
            method: "POST",
            headers: {
                "api-subscription-key": process.env.SARVAM_API_KEY!,
            },
            body: sarvamFormData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Sarvam API error:", errorText);
            throw new Error(`Sarvam API failed: ${response.status} ${errorText}`);
        }

        const result = await response.json();

        return NextResponse.json({
            language_code: result.language_code,
            transcript: result.transcript,
        });
    } catch (error) {
        console.error("Speech-to-text error:", error);
        return NextResponse.json(
            { error: "Transcription failed", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
