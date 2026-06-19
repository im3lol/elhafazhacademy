import { google } from "googleapis";
import { authedClient } from "@/lib/google/client";

export type MeetEventResult = { eventId: string; meetLink: string } | null;

/**
 * ينشئ حدث Google Calendar مع رابط Google Meet.
 * يعيد null إذا لم يكن حساب Google مربوطاً.
 */
export async function createMeetEvent(input: {
  summary: string;
  description?: string;
  startISO: string;
  endISO: string;
  timeZone?: string;
  attendees?: string[];
}): Promise<MeetEventResult> {
  const auth = await authedClient();
  if (!auth) return null;

  const calendar = google.calendar({ version: "v3", auth });
  const requestId = `elhafazah-${input.startISO}-${Math.round(input.endISO.length)}`;

  const res = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    sendUpdates: "none",
    requestBody: {
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.startISO, timeZone: input.timeZone ?? "Africa/Cairo" },
      end: { dateTime: input.endISO, timeZone: input.timeZone ?? "Africa/Cairo" },
      attendees: input.attendees?.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  const eventId = res.data.id ?? "";
  const meetLink =
    res.data.hangoutLink ??
    res.data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ??
    "";

  if (!eventId || !meetLink) return null;
  return { eventId, meetLink };
}
