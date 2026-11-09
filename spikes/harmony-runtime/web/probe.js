const animation = {"v":"5.12.2","fr":30,"ip":0,"op":30,"w":128,"h":128,"nm":"ArkCompat original probe","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"Original probe","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":1,"k":[{"t":0,"s":[32,64,0],"e":[96,64,0],"i":{"x":[0.67],"y":[1]},"o":{"x":[0.33],"y":[0]}},{"t":29,"s":[96,64,0]}]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"ao":0,"shapes":[{"ty":"el","p":{"a":0,"k":[0,0]},"s":{"a":0,"k":[56,56]},"nm":"Original circle","d":1},{"ty":"fl","c":{"a":0,"k":[0.12,0.55,0.95,1]},"o":{"a":0,"k":100},"r":1}],"ip":0,"op":30,"st":0,"bm":0}],"markers":[]};

const target = document.querySelector('#canvas-target');
const state = document.querySelector('#state');
const player = lottie.loadAnimation({container: target, renderer:'canvas', loop:true, autoplay:true, animationData:animation});
window.probe = { events: [], player };
player.addEventListener('DOMLoaded', () => {
  window.probe.events.push('loaded'); state.textContent = 'loaded';
});
player.addEventListener('loopComplete', () => {
  if (!window.probe.events.includes('loop')) {
    window.probe.events.push('loop'); state.textContent = 'loop observed';
  }
});
player.addEventListener('destroy', () => window.probe.events.push('destroyed'));
document.querySelector('#destroy').onclick = () => {
  player.destroy();
  state.textContent = 'destroyed';
};
