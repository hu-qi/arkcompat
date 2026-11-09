import lottie, { AnimationItem } from '@ohos/lottie'
import { hilog } from '@kit.PerformanceAnalysisKit'

@Entry
@Component
struct Index {
  private ctx: CanvasRenderingContext2D = new CanvasRenderingContext2D(new RenderingContextSettings(true))
  private player?: AnimationItem
  @State stateText: string = 'waiting'

  private startAnimation(): void {
    try {
      this.player = lottie.loadAnimation({
        container: this.ctx,
        renderer: 'canvas',
        loop: true,
        autoplay: true,
        animationData: JSON.parse('{"v":"5.12.2","fr":30,"ip":0,"op":30,"w":128,"h":128,"nm":"ArkCompat original probe","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"Original probe","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":1,"k":[{"t":0,"s":[32,64,0],"e":[96,64,0],"i":{"x":[0.67],"y":[1]},"o":{"x":[0.33],"y":[0]}},{"t":29,"s":[96,64,0]}]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"ao":0,"shapes":[{"ty":"el","p":{"a":0,"k":[0,0]},"s":{"a":0,"k":[56,56]},"nm":"Original circle","d":1},{"ty":"fl","c":{"a":0,"k":[0.12,0.55,0.95,1]},"o":{"a":0,"k":100},"r":1}],"ip":0,"op":30,"st":0,"bm":0}],"markers":[]}')
      })
      this.stateText = 'loaded'
      hilog.info(0x00AC, 'ArkCompatLottie', 'probe_loaded')
      this.player.addEventListener('loopComplete', () => {
        if (this.stateText === 'loaded') {
          this.stateText = 'loop observed'
          hilog.info(0x00AC, 'ArkCompatLottie', 'probe_loop')
        }
      })
    } catch (_) {
      this.stateText = 'failed'
      hilog.error(0x00AC, 'ArkCompatLottie', 'probe_failed')
    }
  }

  private cleanup(): void {
    if (this.player) {
      this.player.destroy()
      this.player = undefined
      this.stateText = 'destroyed'
      hilog.info(0x00AC, 'ArkCompatLottie', 'probe_destroyed')
    }
  }

  aboutToDisappear(): void {
    this.cleanup()
  }

  build() {
    Column({ space: 12 }) {
      Text('ArkCompat Lottie probe')
      Text(this.stateText)
      Canvas(this.ctx).width(128).height(128).onReady(() => this.startAnimation())
      Button('Destroy probe').onClick(() => this.cleanup())
    }.width('100%').height('100%').justifyContent(FlexAlign.Center)
  }
}
