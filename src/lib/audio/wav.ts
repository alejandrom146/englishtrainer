/**
 * Gemini solo acepta audio en WAV/MP3/AIFF/AAC/OGG/FLAC — pero
 * MediaRecorder graba en formatos distintos según el navegador (webm en
 * Chrome, mp4 en Safari...). En vez de intentar adivinar cuál acepta la
 * API, decodificamos lo que sea que grabó el navegador y lo volvemos a
 * codificar como WAV nosotros mismos. Así siempre enviamos un formato que
 * sabemos que funciona, sin importar el navegador.
 */
export async function blobToWavBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new (window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const wavBlob = audioBufferToWav(audioBuffer);
  const wavArrayBuffer = await wavBlob.arrayBuffer();

  await audioContext.close();

  return arrayBufferToBase64(wavArrayBuffer);
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  // Mezcla a mono (promedio de canales) para mantener el archivo chico —
  // no se necesita estéreo para evaluar pronunciación.
  const numFrames = buffer.length;
  const mono = new Float32Array(numFrames);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const channelData = buffer.getChannelData(ch);
    for (let i = 0; i < numFrames; i++) {
      mono[i] += channelData[i] / buffer.numberOfChannels;
    }
  }

  const sampleRate = buffer.sampleRate;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = bytesPerSample;
  const dataSize = numFrames * bytesPerSample;

  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // audio format = PCM
  view.setUint16(22, 1, true); // channels = mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    const sample = Math.max(-1, Math.min(1, mono[i]));
    view.setInt16(
      offset,
      sample < 0 ? sample * 0x8000 : sample * 0x7fff,
      true
    );
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
