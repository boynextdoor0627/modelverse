import assert from "node:assert/strict";
import test from "node:test";
import { estimateMemory, estimateRoofline } from "../app/deployment-math.ts";

test("MoE resident memory uses total parameters, not active parameters", () => {
  const result = estimateMemory({ totalParamsB:671, bytesPerParameter:.5, kvKBPerToken:72, contextK:4, concurrency:1, frameworkFactor:1 });
  assert.equal(result.weightsGB, 335.5);
  assert.ok(result.weightsGB > 18.5);
});

test("KV cache scales linearly with peak concurrency", () => {
  const one = estimateMemory({ totalParamsB:8, bytesPerParameter:1, kvKBPerToken:64, contextK:16, concurrency:1, frameworkFactor:1 });
  const twenty = estimateMemory({ totalParamsB:8, bytesPerParameter:1, kvKBPerToken:64, contextK:16, concurrency:20, frameworkFactor:1 });
  assert.equal(twenty.kvGB, one.kvGB * 20);
});

test("prefill formula preserves B-parameter and TFLOPS units", () => {
  const result = estimateRoofline({ activeParamsB:7, bytesPerParameter:.5, promptTokens:512, generationTokens:1024, gpuBandwidthGBs:864, gpuBf16Tflops:362, gpuCount:1, decodeEfficiency:.65, prefillEfficiency:1, communicationEfficiency:1 });
  assert.ok(Math.abs(result.prefillMs - 19.8011) < .001);
  assert.ok(result.prefillMs < 100);
});
