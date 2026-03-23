import speech from '@google-cloud/speech';

// Support inline credentials JSON (GOOGLE_CREDENTIALS_JSON) as an alternative
// to a key file path (GOOGLE_APPLICATION_CREDENTIALS)
function createSpeechClient() {
  const inlineJson = process.env.GOOGLE_CREDENTIALS_JSON;
  if (inlineJson) {
    const credentials = JSON.parse(inlineJson);
    return new speech.SpeechClient({ credentials });
  }
  return new speech.SpeechClient();
}

const client = createSpeechClient();

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  console.log('[Transcription] Starting transcription, audio size:', audioBuffer.length);

  const audioBytes = audioBuffer.toString('base64');

  const request = {
    audio: {
      content: audioBytes,
    },
    config: {
      encoding: 'WEBM_OPUS' as const,
      sampleRateHertz: 48000,
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      enableWordTimeOffsets: true,
      enableSpeakerDiarization: true,
      diarizationSpeakerCount: 6,
      model: 'latest_long',
    },
  };

  try {
    console.log('[Transcription] Sending to Google Speech-to-Text...');
    const [response] = await client.recognize(request);

    if (!response.results || response.results.length === 0) {
      console.log('[Transcription] No results returned');
      return '';
    }

    const transcript = response.results
      .map((result) => {
        const alternative = result.alternatives?.[0];
        if (!alternative) return '';
        return alternative.transcript || '';
      })
      .filter(Boolean)
      .join('\n');

    console.log('[Transcription] Completed, transcript length:', transcript.length);
    return transcript;
  } catch (error) {
    console.error('[Transcription] Error:', error);
    throw error;
  }
}

export async function transcribeAudioLongRunning(audioBuffer: Buffer): Promise<string> {
  console.log('[Transcription] Starting long-running transcription, audio size:', audioBuffer.length);

  const audioBytes = audioBuffer.toString('base64');

  const request = {
    audio: {
      content: audioBytes,
    },
    config: {
      encoding: 'WEBM_OPUS' as const,
      sampleRateHertz: 48000,
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      enableWordTimeOffsets: true,
      enableSpeakerDiarization: true,
      diarizationSpeakerCount: 6,
      model: 'latest_long',
    },
  };

  try {
    console.log('[Transcription] Starting long-running operation...');
    const [operation] = await client.longRunningRecognize(request);

    console.log('[Transcription] Waiting for operation to complete...');
    const [response] = await operation.promise();

    if (!response.results || response.results.length === 0) {
      console.log('[Transcription] No results returned');
      return '';
    }

    // Use the last result for diarized transcript (contains all speakers)
    const lastResult = response.results[response.results.length - 1];
    const words = lastResult.alternatives?.[0]?.words || [];

    if (words.length > 0) {
      // Build diarized transcript
      let transcript = '';
      let currentSpeaker = -1;
      let currentText = '';

      for (const word of words) {
        const speakerTag = word.speakerTag || 0;
        if (speakerTag !== currentSpeaker) {
          if (currentText) {
            transcript += `Speaker ${currentSpeaker}: ${currentText.trim()}\n`;
          }
          currentSpeaker = speakerTag;
          currentText = (word.word || '') + ' ';
        } else {
          currentText += (word.word || '') + ' ';
        }
      }
      if (currentText) {
        transcript += `Speaker ${currentSpeaker}: ${currentText.trim()}`;
      }

      console.log('[Transcription] Diarized transcript length:', transcript.length);
      return transcript;
    }

    // Fallback to simple transcript
    const transcript = response.results
      .map((result) => result.alternatives?.[0]?.transcript || '')
      .filter(Boolean)
      .join('\n');

    console.log('[Transcription] Completed, transcript length:', transcript.length);
    return transcript;
  } catch (error) {
    console.error('[Transcription] Long-running error:', error);
    throw error;
  }
}
