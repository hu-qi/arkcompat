import lottie, { AnimationItem } from '@ohos/lottie'
import { hilog } from '@kit.PerformanceAnalysisKit'

@Entry
@Component
struct Index {
  private ctx: CanvasRenderingContext2D = new CanvasRenderingContext2D(new RenderingContextSettings(true))
  private player?: AnimationItem
  private frameLogCount: number = 0
  private domLoadedCount: number = 0
  private playbackStarted: boolean = false
  private fallbackAttempts: number = 0
  private loopEventCount: number = 0
  private loopWindowStartMs: number = 0
  private loopWindowLogged: boolean = false
  private destroyEventCount: number = 0
  @State stateText: string = 'waiting'
  @State frameText: string = 'frame=not-ready'

  private startAnimation(): void {
    if (this.player) {
      return
    }
    try {
      this.stateText = 'loading'
      this.player = lottie.loadAnimation({
        container: this.ctx,
        renderer: 'canvas',
        loop: true,
        autoplay: false,
        animationData: JSON.parse('{"v":"5.12.2","fr":30,"ip":0,"op":30,"w":128,"h":128,"nm":"ArkCompat original probe","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"Original probe","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":1,"k":[{"t":0,"s":[32,64,0],"e":[96,64,0],"i":{"x":[0.67],"y":[1]},"o":{"x":[0.33],"y":[0]}},{"t":29,"s":[96,64,0]}]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"ao":0,"shapes":[{"ty":"el","p":{"a":0,"k":[0,0]},"s":{"a":0,"k":[56,56]},"nm":"Original circle","d":1},{"ty":"fl","c":{"a":0,"k":[0.12,0.55,0.95,1]},"o":{"a":0,"k":100},"r":1}],"ip":0,"op":30,"st":0,"bm":0}],"markers":[]}')
      })
      this.player.addEventListener('DOMLoaded', () => {
        this.domLoadedCount += 1
        this.stateText = 'loaded (library event)'
        this.frameText = `frame=${this.player?.currentFrame ?? -1} ${Date.now()}`
        hilog.info(0x00AC, 'ArkCompatLottie', `probe_domloaded sequence=${this.domLoadedCount} isLoaded=${this.player?.isLoaded} frame=${this.player?.currentFrame} timestampMs=${Date.now()}`)
        this.beginPlayback('DOMLoaded')
      })
      this.player.addEventListener('enterFrame', () => {
        if (this.frameLogCount < 10 && this.player) {
          this.frameLogCount += 1
          hilog.info(0x00AC, 'ArkCompatLottie', `probe_frame frame=${this.player.currentFrame} rawFrame=${this.player.currentRawFrame} playCount=${this.player.playCount} timestampMs=${Date.now()}`)
        }
      })
      this.player.addEventListener('segmentStart', () => {
        hilog.info(0x00AC, 'ArkCompatLottie', `probe_segment_start frame=${this.player?.currentFrame} playCount=${this.player?.playCount} timestampMs=${Date.now()}`)
      })
      this.player.addEventListener('loopComplete', () => {
        this.loopEventCount += 1
        const eventMs = Date.now()
        const elapsedMs = eventMs - this.loopWindowStartMs
        this.stateText = `loops=${this.loopEventCount}`
        hilog.info(0x00AC, 'ArkCompatLottie', `probe_loop sequence=${this.loopEventCount} frame=${this.player?.currentFrame} playCount=${this.player?.playCount} elapsedMs=${elapsedMs} timestampMs=${eventMs}`)
        if (this.loopEventCount >= 10 && !this.loopWindowLogged) {
          this.loopWindowLogged = true
          this.stateText = `10 loops over ${elapsedMs} ms`
          hilog.info(0x00AC, 'ArkCompatLottie', `probe_loop_window count=${this.loopEventCount} elapsedMs=${elapsedMs} timestampMs=${eventMs}`)
        }
      })
      this.player.addEventListener('complete', () => {
        hilog.info(0x00AC, 'ArkCompatLottie', `probe_complete frame=${this.player?.currentFrame} playCount=${this.player?.playCount} timestampMs=${Date.now()}`)
      })
      this.player.addEventListener('destroy', () => {
        this.stateText = 'destroy event observed'
        this.frameText = `destroy=${Date.now()}`
        this.destroyEventCount += 1
        hilog.info(0x00AC, 'ArkCompatLottie', `probe_library_destroy sequence=${this.destroyEventCount} timestampMs=${Date.now()}`)
      })
      this.schedulePlaybackFallback()
    } catch (_) {
      this.stateText = 'failed'
      hilog.error(0x00AC, 'ArkCompatLottie', 'probe_failed')
    }
  }

  private beginPlayback(trigger: string): void {
    if (!this.player || this.playbackStarted || !this.player.isLoaded) {
      return
    }
    this.playbackStarted = true
    this.loopWindowStartMs = Date.now()
    hilog.info(0x00AC, 'ArkCompatLottie', `probe_playback_start trigger=${trigger} isLoaded=${this.player.isLoaded} timestampMs=${this.loopWindowStartMs}`)
    this.player.play()
  }

  private schedulePlaybackFallback(): void {
    setTimeout(() => {
      if (this.playbackStarted || this.fallbackAttempts >= 20) {
        return
      }
      this.fallbackAttempts += 1
      hilog.info(0x00AC, 'ArkCompatLottie', `probe_playback_fallback attempt=${this.fallbackAttempts} isLoaded=${this.player?.isLoaded} timestampMs=${Date.now()}`)
      if (this.player?.isLoaded) {
        this.stateText = 'loaded (isLoaded fallback)'
        this.beginPlayback('isLoaded-fallback')
      } else {
        this.schedulePlaybackFallback()
      }
    }, 250)
  }

  private pauseAtFrame(frame: number): void {
    if (this.player) {
      this.player.goToAndStop(frame, true)
      this.stateText = `frame ${frame} pinned`
      this.frameText = `frame=${this.player.currentFrame} rawFrame=${this.player.currentRawFrame} ${Date.now()}`
      hilog.info(0x00AC, 'ArkCompatLottie', `probe_frame_pinned captureId=pinned-${frame} requested=${frame} currentFrame=${this.player.currentFrame} rawFrame=${this.player.currentRawFrame} timestampMs=${Date.now()}`)
    }
  }

  private cleanup(): void {
    if (this.player) {
      this.player.destroy()
      this.player = undefined
      this.frameText = 'destroy=completed'
      hilog.info(0x00AC, 'ArkCompatLottie', `probe_destroy_returned timestampMs=${Date.now()}`)
    }
  }

  aboutToDisappear(): void {
    this.cleanup()
  }

  build() {
    Column({ space: 12 }) {
      Text('ArkCompat Lottie probe')
      Text(this.stateText)
      Text(this.frameText)
      Canvas(this.ctx).width(128).height(128).onReady(() => this.startAnimation())
      Row({ space: 8 }) {
        Button('Pause frame 0').onClick(() => this.pauseAtFrame(0))
        Button('Pause frame 18').onClick(() => this.pauseAtFrame(18))
      }
      Button('Destroy probe').onClick(() => this.cleanup())
    }.width('100%').height('100%').justifyContent(FlexAlign.Center)
  }
}
