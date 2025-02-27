import axios from "axios";

export const fetchCalendars = async (userId) => {
  try {
    const response = await axios.get(
      "http://localhost:3001/nylas/calendar/get",
      {
        params: { userId },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching calendars:", error);
    throw error;
  }
};

export const fetchEventsForCalendar = async (calendarId, grantId) => {
  try {
    const response = await axios.post(
      "http://localhost:3001/nylas/calendar/get-events",
      {
        grantId: grantId,
        calendarId: calendarId,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching events for calendar:", error);
    throw error;
  }
};

export const fetchCalendarsWithEvents = async (userId) => {
  try {
    const fetchedCalendars = await fetchCalendars(userId);

    for (const provider of fetchedCalendars) {
      const calendars = provider.calendars;

      const promises = calendars.map((calendar) =>
        fetchEventsForCalendar(calendar.id, calendar.grantId)
      );
      const results = await Promise.all(promises);

      calendars.map(
        (calendar, index) => (calendar.events = results[index].data)
      );
    }

    return { fetchedCalendars: fetchedCalendars };
  } catch (error) {
    console.error("Error fetching calendars with events:", error);
    return { error: "Error fetching calendars with events" };
  }
};

export const createTaskForCalendar = async (
  title,
  description,
  startTime,
  calendarId,
  grantId
) => {
  try {
    await axios.post("http://localhost:3001/nylas/calendar/create-task", {
      grantId: grantId,
      calendarId: calendarId,
      title: title,
      description: description,
      startTime: startTime,
    });
  } catch (error) {
    console.error("Error creating task for calendar:", error);
    throw error;
  }
};

export const createTaskForCalendars = async (formData, calendars) => {
  const { title, description, startDateTime } = Object.fromEntries(
    formData.entries()
  );

  if (calendars.length < 1) {
    return { status: "Please select one or more calendars" };
  }

  const startTime = Math.floor(Date.parse(startDateTime) / 1000);

  try {
    await Promise.all(
      calendars.map((calendar) =>
        createTaskForCalendar(
          title.trim(),
          description.trim(),
          startTime,
          calendar.id,
          calendar.grantId
        )
      )
    );

    return { status: "Successfully added task to selected calendars" };
  } catch (error) {
    console.error(error);
    return { status: "Error adding task to one or more calendars" };
  }
};

export const createEventForCalendar = async (
  title,
  description,
  startTime,
  endTime,
  participants,
  calendarId,
  grantId
) => {
  try {
    await axios.post("http://localhost:3001/nylas/calendar/create-event", {
      grantId: grantId,
      calendarId: calendarId,
      title: title,
      description: description,
      participants: participants,
      startTime: startTime,
      endTime: endTime,
    });
  } catch (error) {
    console.error("Error creating event for calendar:", error);
    throw error;
  }
};

export const createEventForCalendars = async (formData, calendars) => {
  const { title, description, startDateTime, endDateTime, participants } =
    Object.fromEntries(formData.entries());

  if (calendars.length < 1) {
    return { status: "Please select one or more calendars" };
  }

  const startTime = Date.parse(startDateTime);
  const endTime = Date.parse(endDateTime);

  if (startTime > endTime) {
    return { status: "Start time must be before End time" };
  }

  const participantsArr = participants.trim()
    ? participants
        .trim()
        .split(/\s+/)
        .map((participantEmail) => ({ email: participantEmail }))
    : [];

  try {
    await Promise.all(
      calendars.map((calendar) =>
        createEventForCalendar(
          title.trim(),
          description.trim(),
          startTime,
          endTime,
          participantsArr,
          calendar.id,
          calendar.grantId
        )
      )
    );

    return { status: "Successfully added event to selected calendars" };
  } catch (error) {
    console.error(error);
    return { status: "Error adding event to one or more calendars" };
  }
};

export const checkCalendarAvailability = async (formData, participants) => {
  const { startDateTime, endDateTime, duration } = Object.fromEntries(
    formData.entries()
  );
  const startTime = Math.floor(Date.parse(startDateTime) / 1000);
  const endTime = Math.floor(Date.parse(endDateTime) / 1000);

  if (startTime % 300 !== 0 || endTime % 300 !== 0) {
    return {
      status: "Start time and End time must be a mulitple of 5 minutes",
    };
  }

  if (parseInt(duration) % 5 !== 0) {
    return {
      status: "Duration must be a mulitple of 5 minutes",
    };
  }

  if (startTime >= endTime) {
    return { status: "Start time must be before End time" };
  }

  const participantsArr = participants.trim()
    ? participants
        .trim()
        .split(/\s+/)
        .map((participantEmail) => ({ email: participantEmail }))
    : [];

  if (participantsArr.length < 1) {
    return { status: "please enter at least one participant" };
  }

  try {
    const response = await axios.post(
      "http://localhost:3001/nylas/calendar/check-availability",
      {
        startTime: startTime,
        endTime: endTime,
        duration: parseInt(duration),
        participants: participantsArr,
      }
    );

    const timeSlots = response.data.timeSlots;
    const commonTimeSlots = timeSlots.filter(
      (timeSlot) => timeSlot.emails.length === participantsArr.length
    );

    return {
      availabilities: commonTimeSlots,
      status: "Successfully checked availability",
    };
  } catch (error) {
    console.error("Error checking availability for participants:", error);
    return { status: "Something went wrong" };
  }
};
