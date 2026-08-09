// 旁白音訊 <-> base64 Int16 PCM，用於專案檔序列化。
// Float32Array 直接進 JSON.stringify 會變成 {"0":..,"1":..} 巨型物件；
// Int16 + base64 約為原始 float 文字量的 1/10，60 秒 24kHz 旁白約 3.8MB。

export function encodeAudioB64(data: Float32Array): string {
  const int16 = new Int16Array(data.length)
  for (let i = 0; i < data.length; i++) {
    const v = Math.max(-1, Math.min(1, data[i]))
    int16[i] = v < 0 ? v * 0x8000 : v * 0x7fff
  }
  const bytes = new Uint8Array(int16.buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function decodeAudioB64(b64: string): Float32Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const int16 = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2))
  const out = new Float32Array(int16.length)
  for (let i = 0; i < int16.length; i++) {
    out[i] = int16[i] < 0 ? int16[i] / 0x8000 : int16[i] / 0x7fff
  }
  return out
}
