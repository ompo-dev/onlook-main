// src/Editor/utils/spring.ts
var defaultSpring = {
  duration: 0.3,
  bounce: 0.2,
  stiffness: 1e3,
  damping: 100,
  mass: 1,
  type: "time"
};
function makeSpring(config) {
  const resolved = { ...defaultSpring, ...config };
  let options = { keyframes: [0, 1] };
  if (resolved.type === "physics") {
    options = {
      ...options,
      stiffness: resolved.stiffness,
      damping: resolved.damping,
      mass: resolved.mass
    };
  } else {
    options = {
      ...options,
      bounce: resolved.bounce,
      duration: resolved.duration * 1e3
    };
  }
  return spring(options);
}
function toSpringComment(config) {
  const resolved = { ...defaultSpring, ...config };
  const parts = [];
  if (resolved.type === "physics") {
    parts.push(`stiffness=${resolved.stiffness}`);
    parts.push(`damping=${resolved.damping}`);
    parts.push(`mass=${resolved.mass}`);
  } else {
    parts.push(`bounce=${resolved.bounce}`);
    parts.push(`duration=${resolved.duration}`);
  }
  return `/* motion-spring: ${parts.join(" ")} */`;
}
function springToCss(config) {
  const springEasing = makeSpring(config);
  const comment = toSpringComment(config);
  let springStr = springEasing.toString();
  const msMatch = springStr.match(/^(\d+)ms\s+/);
  if (msMatch) {
    const seconds = parseInt(msMatch[1]) / 1e3;
    const timingFunction = springStr.replace(/^\d+ms\s+/, "");
    return {
      duration: `${seconds}s`,
      timingFunction,
      comment
    };
  }
  return {
    duration: "0.3s",
    timingFunction: springStr,
    comment
  };
}

