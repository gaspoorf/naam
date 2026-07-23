import { float } from "three/tsl";
export const quintic = (t: ReturnType<typeof float>) => {
  const t2 = t.mul(t), t3 = t2.mul(t);
  return t3.mul(float(10).sub(t.mul(float(15).sub(t.mul(6)))));
};
