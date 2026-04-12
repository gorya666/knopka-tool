# Skill: Podcast Prompt Engineering

## Purpose
Documents how the Radio Knopka system prompt works so Claude Code
doesn't accidentally break it when making changes nearby.

## Location
src/lib/prompt.ts — ALWAYS ask before editing this file.

## How the prompt works
1. Sets role + voice (Ukrainian, casual-smart, Radio Knopka style)
2. Provides 3 real episode examples as few-shot reference
3. Defines per-field rules (titles, showNotes, chapters, clips, social)
4. Ends with strict JSON schema + "return ONLY JSON" instruction

## Why one API call
All outputs are generated in a single call. This is intentional:
- One context load = most token-efficient approach
- Claude sees all fields at once = better consistency across outputs
- One loading state = simpler UX

## Model
claude-sonnet-4-20250514 — do not downgrade to Haiku for this task,
the transcript is long and quality matters.

## If outputs are bad quality
Don't change the code — iterate on the prompt text in prompt.ts:
- Add more/better few-shot examples
- Tighten field-specific rules
- Add negative examples ("DO NOT write...")

## Token estimate per run
- Input: ~6,000-15,000 tokens (transcript) + ~1,500 tokens (prompt)
- Output: ~1,500-2,500 tokens (all fields)
- Total: ~10,000-19,000 tokens per episode run
- Cost at Sonnet pricing: ~$0.05-0.10 per run ✅
