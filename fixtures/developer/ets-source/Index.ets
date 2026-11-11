import lottie, { AnimationItem, loadAnimation as load } from '@ohos/lottie'
import { hilog } from '@kit.PerformanceAnalysisKit'
import * as graphics from 'example.graphics'
import { Widget } from 'example-client'

@Entry
@Component
struct Index {
  private player?: AnimationItem

  startAnimation(): void {
    this.player = lottie.loadAnimation({ autoplay: false })
    load({ autoplay: false })
    hilog.info(0x00ac, 'Fixture', 'started')
    graphics.Canvas.render()
    this.widget = new Widget()
  }

  startShadowed(lottie: Object, hilog: Object): void {
    lottie.loadAnimation({ autoplay: false })
    hilog.info(0x00ac, 'Fixture', 'shadowed')
  }

  build() {
    Column({ space: 12 }) {
      Text('ArkCompat ETS fixture')
      Button('Start').onClick(() => this.startAnimation())
    }.width('100%')
  }
}
