
import { Twilio } from 'twilio';

export async function getTwilioPhoneNumbers(sid: string, token: string) {
  const client = new Twilio(sid, token);
  try {
    const numbers = await client.incomingPhoneNumbers.list();
    return numbers.map(num => ({ sid: num.sid, phoneNumber: num.phoneNumber }));
  } catch (error) {
    console.error("Error fetching Twilio numbers:", error);
    throw new Error('Failed to fetch Twilio numbers. Please check your credentials.');
  }
}
