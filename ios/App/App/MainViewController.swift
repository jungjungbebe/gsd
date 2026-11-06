import UIKit
import Capacitor

// 투톤 iOS 셸: 웹뷰에서 왼쪽 가장자리 스와이프로 뒤로 가기를 켠다.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        webView?.allowsBackForwardNavigationGestures = true
        // 당겨서 늘어나는 바운스는 유지하되, 위쪽 바운스 배경이 비치지 않게
        webView?.scrollView.backgroundColor = .black
        webView?.isOpaque = false
    }
}
