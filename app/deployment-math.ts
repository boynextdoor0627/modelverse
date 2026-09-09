export type MemoryEstimateInput = {
  totalParamsB: number;
  bytesPerParameter: number;
  kvKBPerToken: number;
  contextK: number;
  concurrency: number;
  frameworkFactor: number;
};

export function estimateMemory(input: MemoryEstimateInput) {
  const weightsGB = input.totalParamsB * input.bytesPerParameter;
  const kvGB = input.kvKBPerToken * input.contextK * 1000 * input.concurrency / 1_000_000;
  const totalGB = (weightsGB + kvGB) * input.frameworkFactor;
  return { weightsGB, kvGB, totalGB };
}

export type RooflineInput = {
  activeParamsB: number;
  bytesPerParameter: number;
  promptTokens: number;
  generationTokens: number;
  gpuBandwidthGBs: number;
  gpuBf16Tflops: number;
  gpuCount: number;
  decodeEfficiency: number;
  prefillEfficiency: number;
  communicationEfficiency: number;
};

export function estimateRoofline(input: RooflineInput) {
  const activeWeightReadGB = Math.max(.1, input.activeParamsB * input.bytesPerParameter);
  const effectiveBandwidth = input.gpuBandwidthGBs * input.gpuCount * input.decodeEfficiency * input.communicationEfficiency;
  const decodeTokensPerSecond = effectiveBandwidth / activeWeightReadGB;
  // params(B) / compute(TFLOPS) naturally contributes 1e-3 seconds;
  // converting seconds to milliseconds cancels that factor.
  const prefillMs = 2 * input.activeParamsB * input.promptTokens
    / Math.max(1, input.gpuBf16Tflops * input.gpuCount * input.prefillEfficiency * input.communicationEfficiency);
  const generationSeconds = input.generationTokens / Math.max(.1, decodeTokensPerSecond);
  return {
    decodeTokensPerSecond,
    prefillMs,
    generationSeconds,
    requestLatencySeconds: prefillMs / 1000 + generationSeconds,
  };
}
