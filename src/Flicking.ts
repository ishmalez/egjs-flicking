/**
 * Copyright (c) 2015 NAVER Corp.
 * egjs projects are licensed under the MIT license
 */

import Component from "@egjs/component";
import Viewport from "./components/Viewport";
import Panel from "./components/Panel";

import { merge, getProgress, parseElement, isString, counter } from "./utils";
import { DEFAULT_OPTIONS, EVENTS, DIRECTION, AXES_EVENTS, STATE_TYPE, DEFAULT_MOVE_TYPE_OPTIONS } from "./consts";
import { FlickingOptions, FlickingEvent, Direction, EventType, FlickingPanel, TriggerCallback, FlickingContext, FlickingStatus, Plugin, ElementLike, DestroyOption } from "./types";
import { sendEvent } from "./ga/ga";
import { DiffResult } from "@egjs/list-differ";

/**
 * @memberof eg
 * @extends eg.Component
 * @support {"ie": "10+", "ch" : "latest", "ff" : "latest",  "sf" : "latest" , "edge" : "latest", "ios" : "7+", "an" : "4.X+"}
 * @requires {@link https://github.com/naver/egjs-component|eg.Component}
 * @requires {@link https://github.com/naver/egjs-axes|eg.Axes}
 * @see Easing Functions Cheat Sheet {@link http://easings.net/} <ko>이징 함수 Cheat Sheet {@link http://easings.net/}</ko>
 */
class Flicking extends Component {
  /**
   * Version info string
   * @ko 버전정보 문자열
   * @example
   * eg.Flicking.VERSION;  // ex) 3.0.0
   * @memberof eg.Flicking
   */
  public static VERSION: string = "#__VERSION__#";
  /**
   * Direction constant - "PREV" or "NEXT"
   * @ko 방향 상수 - "PREV" 또는 "NEXT"
   * @type {object}
   * @property {"PREV"} PREV - Prev direction from current hanger position.<br/>It's `left(←️)` direction when `horizontal: true`.<br/>Or, `up(↑️)` direction when `horizontal: false`.<ko>현재 행어를 기준으로 이전 방향.<br/>`horizontal: true`일 경우 `왼쪽(←️)` 방향.<br/>`horizontal: false`일 경우 `위쪽(↑️)`방향이다.</ko>
   * @property {"NEXT"} NEXT - Next direction from current hanger position.<br/>It's `right(→)` direction when `horizontal: true`.<br/>Or, `down(↓️)` direction when `horizontal: false`.<ko>현재 행어를 기준으로 다음 방향.<br/>`horizontal: true`일 경우 `오른쪽(→)` 방향.<br/>`horizontal: false`일 경우 `아래쪽(↓️)`방향이다.</ko>
   * @example
   * eg.Flicking.DIRECTION.PREV; // "PREV"
   * eg.Flicking.DIRECTION.NEXT; // "NEXT"
   */
  public static DIRECTION: Direction = DIRECTION;

  /**
   * Event type object with event name strings.
   * @ko 이벤트 이름 문자열들을 담은 객체
   * @type {object}
   * @property {"holdStart"} HOLD_START - holdStart event<ko>holdStart 이벤트</ko>
   * @property {"holdEnd"} HOLD_END - holdEnd event<ko>holdEnd 이벤트</ko>
   * @property {"moveStart"} MOVE_START - moveStart event<ko>moveStart 이벤트</ko>
   * @property {"move"} MOVE - move event<ko>move 이벤트</ko>
   * @property {"moveEnd"} MOVE_END - moveEnd event<ko>moveEnd 이벤트</ko>
   * @property {"change"} CHANGE - change event<ko>change 이벤트</ko>
   * @property {"restore"} RESTORE - restore event<ko>restore 이벤트</ko>
   * @property {"select"} SELECT - select event<ko>select 이벤트</ko>
   * @property {"needPanel"} NEED_PANEL - needPanel event<ko>needPanel 이벤트</ko>
   * @example
   * eg.Flicking.EVENTS.MOVE_START; // "MOVE_START"
   */
  public static EVENTS: EventType = EVENTS;

  public options: FlickingOptions;

  private wrapper: HTMLElement;
  private viewport: Viewport;
  private eventContext: FlickingContext;

  /**
   * @param element A base element for the eg.Flicking module. When specifying a value as a `string` type, you must specify a css selector string to select the element.<ko>eg.Flicking 모듈을 사용할 기준 요소. `string`타입으로 값 지정시 요소를 선택하기 위한 css 선택자 문자열을 지정해야 한다.</ko>
   * @param options An option object of the eg.Flicking module<ko>eg.Flicking 모듈의 옵션 객체</ko>
   * @param {string} [options.classPrefix="eg-flick"] A prefix of class name will be added for the panels, viewport and camera.<ko>패널들과 뷰포트, 카메라에 추가될 클래스 이름의 접두사.</ko>
   * @param {number} [options.deceleration=0.0075] Deceleration value for panel movement animation for animation triggered by manual user input. Higher value means shorter running time.<ko>사용자의 동작으로 가속도가 적용된 패널 이동 애니메이션의 감속도. 값이 높을수록 애니메이션 실행 시간이 짧아진다.</ko>
   * @param {boolean} [options.horizontal=true] Direction of panel movement. (true: horizontal, false: vertical)<ko>패널 이동 방향. (true: 가로방향, false: 세로방향)</ko>
   * @param {boolean} [options.circular=false] Enables circular mode, which connects first/last panel for continuous scrolling<ko>순환 모드를 활성화한다. 순환 모드에서는 양 끝의 패널이 서로 연결되어 끊김없는 스크롤이 가능하다.</ko>
   * @param {boolean} [options.infinite=false] Enables infinite mode, which can automatically trigger needPanel until reaching last panel's index reaches lastIndex<ko>무한 모드를 활성화한다. 무한 모드에서는 needPanel 이벤트를 자동으로 트리거한다. 해당 동작은 마지막 패널의 인덱스가 lastIndex와 일치할때까지 일어난다.</ko>
   * @param {number} [options.infiniteThreshold=0] A Threshold from viewport edge before triggering `needPanel` event in infinite mode.<ko>무한 모드에서 `needPanel`이벤트가 발생하기 위한 뷰포트 끝으로부터의 최대 거리.</ko>
   * @param {number} [options.lastIndex=Infinity] Maximum panel index that Flicking can set. Flicking won't trigger `needPanel` when event's panel index is greater than it.<br>Also, if last panel's index reached given index, you can't add more panels.<ko>Flicking이 설정 가능한 패널의 최대 인덱스. `needPanel` 이벤트에 지정된 인덱스가 최대 패널의 개수보다 같거나 커야 하는 경우에 이벤트를 트리거하지 않게 한다.<br>또한, 마지막 패널의 인덱스가 주어진 인덱스와 동일할 경우, 새로운 패널을 더 이상 추가할 수 없다.</ko>
   * @param {number} [options.threshold=40] Movement threshold to change panel(unit: pixel). It should be dragged above the threshold to change current panel.<ko>패널 변경을 위한 이동 임계값 (단위: 픽셀). 주어진 값 이상으로 스크롤해야만 패널 변경이 가능하다.</ko>
   * @param {number} [options.duration=100] Duration of the panel movement animation.(unit: ms)<ko>패널 이동 애니메이션 진행 시간.(단위: ms)</ko>
   * @param {function} [options.panelEffect=x => 1 - Math.pow(1 - x, 3)] An easing function applied to the panel movement animation. Default value is `easeOutCubic`.<ko>패널 이동 애니메이션에 적용할 easing함수. 기본값은 `easeOutCubic`이다.</ko>
   * @param {number} [options.defaultIndex=0] Index of panel to set as default when initializing. A zero-based integer.<ko>초기화시 지정할 디폴트 패널의 인덱스로, 0부터 시작하는 정수.</ko>
   * @param {string[]} [options.inputType=["touch,"mouse"]] Types of input devices to enable.({@link https://naver.github.io/egjs-axes/release/latest/doc/global.html#PanInputOption Reference})<ko>활성화할 입력 장치 종류. ({@link https://naver.github.io/egjs-axes/release/latest/doc/global.html#PanInputOption 참고})</ko>
   * @param {number} [options.thresholdAngle=45] The threshold angle value(0 ~ 90).<br>If input angle from click/touched position is above or below this value in horizontal and vertical mode each, scrolling won't happen.<ko>스크롤 동작을 막기 위한 임계각(0 ~ 90).<br>클릭/터치한 지점으로부터 계산된 사용자 입력의 각도가 horizontal/vertical 모드에서 각각 크거나 작으면, 스크롤 동작이 이루어지지 않는다.</ko>
   * @param {number|string|number[]|string[]} [options.bounce=[10,10]] The size value of the bounce area. Only can be enabled when `circular=false`.<br>You can set different bounce value for prev/next direction by using array.<br>`number` for px value, and `string` for px, and % value relative to viewport size.(ex - 0, "10px", "20%")<ko>바운스 영역의 크기값. `circular=false`인 경우에만 사용할 수 있다.<br>배열을 통해 prev/next 방향에 대해 서로 다른 바운스 값을 지정 가능하다.<br>`number`를 통해 px값을, `stirng`을 통해 px 혹은 뷰포트 크기 대비 %값을 사용할 수 있다.(ex - 0, "10px", "20%")</ko>
   * @param {boolean} [options.autoResize=false] Whether resize() method should be called automatically after window resize event.<ko>window의 `resize` 이벤트 이후 자동으로 resize()메소드를 호출할지의 여부.</ko>
   * @param {boolean} [options.adaptive=false] Whether the height(horizontal)/width(vertical) of the viewport element reflects the height/width value of the panel after completing the movement.<ko>목적 패널로 이동한 후 그 패널의 높이(horizontal)/너비(vertical)값을 뷰포트 요소의 높이/너비값에 반영할지 여부.</ko>
   * @param {number|""} [options.zIndex=2000] z-index value for viewport element.<ko>뷰포트 엘리먼트의 z-index 값.</ko>
   * @param {boolean} [options.bound=false] Prevent view from going out of first/last panel. Only can be enabled when `circular=false`.<ko>뷰가 첫번째와 마지막 패널 밖으로 나가는 것을 막아준다. `circular=false`인 경우에만 사용할 수 있다.</ko>
   * @param {boolean} [options.overflow=false] Disables CSS property `overflow: hidden` in viewport if `true`.<ko>`true`로 설정시 뷰포트에 `overflow: hidden` 속성을 해제한다.</ko>
   * @param {string} [options.hanger="50%"] Reference position of hanger in viewport, which hangs panel anchors should be stopped at.<br>Should be provided in px or % value of viewport size.<br>You can combinate those values with plus/minus sign<br>ex) "50", "100px", "0%", "25% + 100px"<ko>뷰포트 내부의 행어의 위치. 패널의 앵커들이 뷰포트 내에서 멈추는 지점에 해당한다.<br>px값이나, 뷰포트의 크기 대비 %값을 사용할 수 있고, 이를 + 혹은 - 기호로 연계하여 사용할 수도 있다.<br>예) "50", "100px", "0%", "25% + 100px"</ko>
   * @param {string} [options.anchor="50%"] Reference position of anchor in panels, which can be hanged by viewport hanger.<br>Should be provided in px or % value of panel size.<br>You can combinate those values with plus/minus sign<br>ex) "50", "100px", "0%", "25% + 100px"<ko>패널 내부의 앵커의 위치. 뷰포트의 행어와 연계하여 패널이 화면 내에서 멈추는 지점을 설정할 수 있다.<br>px값이나, 패널의 크기 대비 %값을 사용할 수 있고, 이를 + 혹은 - 기호로 연계하여 사용할 수도 있다.<br>예) "50", "100px", "0%", "25% + 100px"</ko>
   * @param {number} [options.gap=0] Space between each panels. Should be given in number.(px).<ko>패널간에 부여할 간격의 크기를 나타내는 숫자.(px)</ko>
   * @param {eg.Flicking.MoveTypeOption} [options.moveType="snap"] Movement style by user input.(ex: snap, freeScroll)<ko>사용자 입력에 의한 이동 방식.(ex: snap, freeScroll)</ko>
   * @param {boolean} [options.collectStatistics=true] Whether to collect statistics on how you are using `Flicking`. These statistical data do not contain any personal information and are used only as a basis for the development of a user-friendly product.<ko>어떻게 `Flicking`을 사용하고 있는지에 대한 통계 수집 여부를 나타낸다. 이 통계자료는 개인정보를 포함하고 있지 않으며 오직 사용자 친화적인 제품으로 발전시키기 위한 근거자료로서 활용한다.</ko>
   */
  constructor(
    element: string | HTMLElement,
    options: Partial<FlickingOptions> = {},
  ) {
    super();

    // Set flicking wrapper user provided
    let wrapper: HTMLElement | null;
    if (isString(element)) {
      wrapper = document.querySelector(element);
      if (!wrapper) {
        throw new Error("Base element doesn't exist.");
      }
    } else if (element.nodeName && element.nodeType === 1) {
      wrapper = element;
    } else {
      throw new Error("Element should be provided in string or HTMLElement.");
    }

    this.wrapper = wrapper;
    // Override default options
    this.options = merge({}, DEFAULT_OPTIONS, options) as FlickingOptions;
    // Override moveType option
    const currentOptions = this.options;
    const moveType = currentOptions.moveType;

    if (moveType in DEFAULT_MOVE_TYPE_OPTIONS) {
      currentOptions.moveType = DEFAULT_MOVE_TYPE_OPTIONS[moveType as keyof typeof DEFAULT_MOVE_TYPE_OPTIONS];
    }

    // Make viewport instance with panel container element
    this.viewport = new Viewport(this, this.options, this.triggerEvent);
    this.listenInput();
    this.listenResize();

    if (this.options.collectStatistics) {
      sendEvent("usage", "options", options);
    }
  }

  /**
   * Move to the previous panel if it exists.
   * @ko 이전 패널이 존재시 해당 패널로 이동한다.
   * @param [duration=options.duration] Duration of the panel movement animation.(unit: ms)<ko>패널 이동 애니메이션 진행 시간.(단위: ms)</ko>
   * @return {eg.Flicking} The instance itself.<ko>인스턴스 자기 자신.</ko>
   */
  public prev(duration?: number): this {
    const currentPanel = this.getCurrentPanel();
    const currentState = this.viewport.stateMachine.getState();

    if (currentPanel && currentState.type === STATE_TYPE.IDLE) {
      const prevPanel = currentPanel.prev();
      if (prevPanel) {
        prevPanel.focus(duration);
      }
    }

    return this;
  }

  /**
   * Move to the next panel if it exists.
   * @ko 다음 패널이 존재시 해당 패널로 이동한다.
   * @param [duration=options.duration] Duration of the panel movement animation(unit: ms).<ko>패널 이동 애니메이션 진행 시간.(단위: ms)</ko>
   * @return {eg.Flicking} The instance itself.<ko>인스턴스 자기 자신.</ko>
   */
  public next(duration?: number): this {
    const currentPanel = this.getCurrentPanel();
    const currentState = this.viewport.stateMachine.getState();

    if (currentPanel && currentState.type === STATE_TYPE.IDLE) {
      const nextPanel = currentPanel.next();
      if (nextPanel) {
        nextPanel.focus(duration);
      }
    }

    return this;
  }

  /**
   * Move to the panel of given index.
   * @ko 주어진 인덱스에 해당하는 패널로 이동한다.
   * @param index The index number of the panel to move.<ko>이동할 패널의 인덱스 번호.</ko>
   * @param duration [duration=options.duration] Duration of the panel movement.(unit: ms)<ko>패널 이동 애니메이션 진행 시간.(단위: ms)</ko>
   * @return {eg.Flicking} The instance itself.<ko>인스턴스 자기 자신.</ko>
   */
  public moveTo(index: number, duration?: number): this {
    const viewport = this.viewport;
    const panel = viewport.panelManager.get(index);
    const state = viewport.stateMachine.getState();

    if (!panel || state.type !== STATE_TYPE.IDLE) {
      return this;
    }

    const anchorPosition = panel.getAnchorPosition();
    const hangerPosition = viewport.getHangerPosition();

    let targetPanel = panel;
    if (this.options.circular) {
      const scrollAreaSize = viewport.getScrollAreaSize();
      // Check all three possible locations, find the nearest position among them.
      const possiblePositions = [
        anchorPosition - scrollAreaSize,
        anchorPosition,
        anchorPosition + scrollAreaSize,
      ];
      const nearestPosition = possiblePositions.reduce((nearest, current) => {
        return (Math.abs(current - hangerPosition) < Math.abs(nearest - hangerPosition))
          ? current
          : nearest;
      }, Infinity) - panel.getRelativeAnchorPosition();

      const identicals = panel.getIdenticalPanels();
      const offset = nearestPosition - anchorPosition;
      if (offset > 0) {
        // First cloned panel is nearest
        targetPanel = identicals[1];
      } else if (offset < 0) {
        // Last cloned panel is nearest
        targetPanel = identicals[identicals.length - 1];
      }

      targetPanel = targetPanel.clone(targetPanel.getCloneIndex(), true);
      targetPanel.setPosition(nearestPosition);
    }
    const currentIndex = this.getIndex();

    if (hangerPosition === targetPanel.getAnchorPosition() && currentIndex === index) {
      return this;
    }

    const eventType = panel.getIndex() === viewport.getCurrentIndex()
      ? ""
      : EVENTS.CHANGE;

    viewport.moveTo(
      targetPanel,
      viewport.findEstimatedPosition(targetPanel),
      eventType,
      null,
      duration,
    );
    return this;
  }

  /**
   * Return index of the current panel. `-1` if no panel exists.
   * @ko 현재 패널의 인덱스 번호를 반환한다. 패널이 하나도 없을 경우 `-1`을 반환한다.
   * @return Current panel's index, zero-based integer.<ko>현재 패널의 인덱스 번호. 0부터 시작하는 정수.</ko>
   */
  public getIndex(): number {
    return this.viewport.getCurrentIndex();
  }

  /**
   * Return the wrapper element user provided in constructor.
   * @ko 사용자가 생성자에서 제공한 래퍼 엘리먼트를 반환한다.
   * @return Wrapper element user provided.<ko>사용자가 제공한 래퍼 엘리먼트.</ko>
   */
  public getElement(): HTMLElement {
    return this.wrapper;
  }

  /**
   * Return current panel. `null` if no panel exists.
   * @ko 현재 패널을 반환한다. 패널이 하나도 없을 경우 `null`을 반환한다.
   * @return Current panel.<ko>현재 패널.</ko>
   */
  public getCurrentPanel(): FlickingPanel | null {
    const viewport = this.viewport;
    const panel = viewport.getCurrentPanel();
    return panel
      ? panel
      : null;
  }

  /**
   * Return the panel of given index. `null` if it doesn't exists.
   * @ko 주어진 인덱스에 해당하는 패널을 반환한다. 해당 패널이 존재하지 않을 시 `null`이다.
   * @return Panel of given index.<ko>주어진 인덱스에 해당하는 패널.</ko>
   */
  public getPanel(index: number): FlickingPanel | null {
    const viewport = this.viewport;
    const panel = viewport.panelManager.get(index);
    return panel
      ? panel
      : null;
  }

  /**
   * Return all panels.
   * @ko 모든 패널들을 반환한다.
   * @param - Should include cloned panels or not.<ko>복사된 패널들을 포함할지의 여부.</ko>
   * @return All panels.<ko>모든 패널들.</ko>
   */
  public getAllPanels(includeClone?: boolean): FlickingPanel[] {
    const viewport = this.viewport;
    const panelManager = viewport.panelManager;
    const panels = includeClone
      ? panelManager.allPanels()
      : panelManager.originalPanels();

    return panels
      .filter(panel => !!panel);
  }

  /**
   * Return the panels currently shown in viewport area.
   * @ko 현재 뷰포트 영역에서 보여지고 있는 패널들을 반환한다.
   * @return Panels currently shown in viewport area.<ko>현재 뷰포트 영역에 보여지는 패널들</ko>
   */
  public getVisiblePanels(): FlickingPanel[] {
    return this.viewport.calcVisiblePanels();
  }

  /**
   * Return visible index of panels currently shown in viewport area. Cloned panels use relative index, which can be negated or bigger than panel count.
   */
  public getVisibleIndex(): { min: number; max: number } {
    return this.viewport.getVisibleIndex();
  }

  /**
   * Return length of original panels.
   * @ko 원본 패널의 개수를 반환한다.
   * @return Length of original panels.<ko>원본 패널의 개수</ko>
   */
  public getPanelCount(): number {
    return this.viewport.panelManager.getPanelCount();
  }

  /**
   * Return how many groups of clones are created.
   * @ko 몇 개의 클론 그룹이 생성되었는지를 반환한다.
   * @return Length of cloned panel groups.<ko>클론된 패널 그룹의 개수</ko>
   */
  public getCloneCount(): number {
    return this.viewport.panelManager.getCloneCount();
  }

  /**
   * Get maximum panel index for `infinite` mode.
   * @ko `infinite` 모드에서 적용되는 추가 가능한 패널의 최대 인덱스 값을 반환한다.
   * @see {@link eg.Flicking.FlickingOptions}
   * @return Maximum index of panel that can be added.<ko>최대 추가 가능한 패널의 인덱스.</ko>
   */
  public getLastIndex(): number {
    return this.viewport.panelManager.getLastIndex();
  }

  /**
   * Set maximum panel index for `infinite' mode.<br>[needPanel]{@link eg.Flicking#events:needPanel} won't be triggered anymore when last panel's index reaches it.<br>Also, you can't add more panels after it.
   * @ko `infinite` 모드에서 적용되는 패널의 최대 인덱스를 설정한다.<br>마지막 패널의 인덱스가 설정한 값에 도달할 경우 더 이상 [needPanel]{@link eg.Flicking#events:needPanel} 이벤트가 발생되지 않는다.<br>또한, 설정한 인덱스 이후로 새로운 패널을 추가할 수 없다.
   * @param - Maximum panel index.
   * @see {@link eg.Flicking.FlickingOptions}
   * @return {eg.Flicking} The instance itself.<ko>인스턴스 자기 자신.</ko>
   */
  public setLastIndex(index: number): this {
    this.viewport.setLastIndex(index);

    return this;
  }

  /**
   * Return panel movement animation.
   * @ko 현재 패널 이동 애니메이션이 진행 중인지를 반환한다.
   * @return Is animating or not.<ko>애니메이션 진행 여부.</ko>
   */
  public isPlaying(): boolean {
    return this.viewport.stateMachine.getState().playing;
  }

  /**
   * Unblock input devices.
   * @ko 막았던 입력 장치로부터의 입력을 푼다.
   * @return {eg.Flicking} The instance itself.<ko>인스턴스 자기 자신.</ko>
   */
  public enableInput(): this {
    this.viewport.enable();

    return this;
  }

  /**
   * Block input devices.
   * @ko 입력 장치로부터의 입력을 막는다.
   * @return {eg.Flicking} The instance itself.<ko>인스턴스 자기 자신.</ko>
   */
  public disableInput(): this {
    this.viewport.disable();

    return this;
  }

  /**
   * Get current flicking status. You can restore current state by giving returned value to [setStatus()]{@link eg.Flicking#setStatus}.
   * @ko 현재 상태 값을 반환한다. 반환받은 값을 [setStatus()]{@link eg.Flicking#setStatus} 메소드의 인자로 지정하면 현재 상태를 복원할 수 있다.
   * @return An object with current status value information.<ko>현재 상태값 정보를 가진 객체.</ko>
   */
  public getStatus(): FlickingStatus {
    const viewport = this.viewport;

    const panels = viewport.panelManager.originalPanels()
      .filter(panel => !!panel)
      .map(panel => {
        return {
          html: panel.getElement().outerHTML,
          index: panel.getIndex(),
        };
      });

    return {
      index: viewport.getCurrentIndex(),
      panels,
      position: viewport.getCameraPosition(),
    };
  }

  /**
   * Restore to the state of the `status`.
   * @ko `status`의 상태로 복원한다.
   * @param status Status value to be restored. You can specify the return value of the [getStatus()]{@link eg.Flicking#getStatus} method.<ko>복원할 상태 값. [getStatus()]{@link eg.Flicking#getStatus}메서드의 반환값을 지정하면 된다.</ko>
   */
  public setStatus(status: FlickingStatus): void {
    this.viewport.restore(status);
  }

  /**
   * Add plugins that can have different effects on Flicking.
   * @ko 플리킹에 다양한 효과를 부여할 수 있는 플러그인을 추가한다.
   * @param - The plugin(s) to add.<ko>추가할 플러그인(들).</ko>
   * @return {eg.Flicking} The instance itself.<ko>인스턴스 자기 자신.</ko>
   */
  public addPlugins(plugins: Plugin | Plugin[]) {
    this.viewport.addPlugins(plugins);
    return this;
  }

  /**
   * Remove plugins from Flicking.
   * @ko 플리킹으로부터 플러그인들을 제거한다.
   * @param - The plugin(s) to remove.<ko>제거 플러그인(들).</ko>
   * @return {eg.Flicking} The instance itself.<ko>인스턴스 자기 자신.</ko>
   */
  public removePlugins(plugins: Plugin | Plugin[]) {
    this.viewport.removePlugins(plugins);
    return this;
  }

  /**
   * Return the reference element and all its children to the state they were in before the instance was created. Remove all attached event handlers. Specify `null` for all attributes of the instance (including inherited attributes).
   * @ko 기준 요소와 그 하위 패널들을 인스턴스 생성전의 상태로 되돌린다. 부착된 모든 이벤트 핸들러를 탈거한다. 인스턴스의 모든 속성(상속받은 속성포함)에 `null`을 지정한다.
   * @example
   * const flick = new eg.Flicking("#flick");
   * flick.destroy();
   * console.log(flick.moveTo); // null
   */
  public destroy(option: Partial<DestroyOption> = {}): void {
    this.off();

    if (this.options.autoResize) {
      window.removeEventListener("resize", this.resize);
    }

    this.viewport.destroy(option);

    // release resources
    for (const x in this) {
      (this as any)[x] = null;
    }
  }

  /**
   * Update panels to current state.
   * @ko 패널들을 현재 상태에 맞춰 갱신한다.
   * @method
   * @return {eg.Flicking} The instance itself.<ko>인스턴스 자기 자신.</ko>
   */
  public resize = (): this => {
    const viewport = this.viewport;
    const options = this.options;

    const allPanels = viewport.panelManager.allPanels();
    allPanels.forEach(panel => panel.unCacheBbox());

    if (!options.renderExternal && options.renderOnlyVisible) {
      const fragment = document.createDocumentFragment();
      allPanels.forEach(panel => fragment.appendChild(panel.getElement()));

      const cameraElement = viewport.getCameraElement();
      cameraElement.innerHTML = "";
      cameraElement.appendChild(fragment);
    }

    viewport.unCacheBbox();
    viewport.resize();

    return this;
  }

  /**
   * Add new panels at the beginning of panels.
   * @ko 제일 앞에 새로운 패널을 추가한다.
   * @param element - Either HTMLElement, HTML string, or array of them.<br>It can be also HTML string of multiple elements with same depth.<ko>HTMLElement 혹은 HTML 문자열, 혹은 그것들의 배열도 가능하다.<br>또한, 같은 depth의 여러 개의 엘리먼트에 해당하는 HTML 문자열도 가능하다.</ko>
   * @return Array of appended panels.<ko>추가된 패널들의 배열</ko>
   * @example
   * // Suppose there were no panels at initialization
   * const flicking = new eg.Flicking("#flick");
   * flicking.replace(3, document.createElement("div")); // Add new panel at index 3
   * flicking.prepend("\<div\>Panel\</div\>"); // Prepended at index 2
   * flicking.prepend(["\<div\>Panel\</div\>", document.createElement("div")]); // Prepended at index 0, 1
   * flicking.prepend("\<div\>Panel\</div\>"); // Prepended at index 0, pushing every panels behind it.
   */
  public prepend(element: ElementLike | ElementLike[]): FlickingPanel[] {
    const viewport = this.viewport;
    const parsedElements = parseElement(element);

    const insertingIndex = Math.max(viewport.panelManager.getRange().min - parsedElements.length, 0);
    return viewport.insert(insertingIndex, parsedElements);
  }

  /**
   * Add new panels at the end of panels.
   * @ko 제일 끝에 새로운 패널을 추가한다.
   * @param element - Either HTMLElement, HTML string, or array of them.<br>It can be also HTML string of multiple elements with same depth.<ko>HTMLElement 혹은 HTML 문자열, 혹은 그것들의 배열도 가능하다.<br>또한, 같은 depth의 여러 개의 엘리먼트에 해당하는 HTML 문자열도 가능하다.</ko>
   * @return Array of appended panels.<ko>추가된 패널들의 배열</ko>
   * @example
   * // Suppose there were no panels at initialization
   * const flicking = new eg.Flicking("#flick");
   * flicking.append(document.createElement("div")); // Appended at index 0
   * flicking.append("\<div\>Panel\</div\>"); // Appended at index 1
   * flicking.append(["\<div\>Panel\</div\>", document.createElement("div")]); // Appended at index 2, 3
   * // Even this is possible
   * flicking.append("\<div\>Panel 1\</div\>\<div\>Panel 2\</div\>"); // Appended at index 4, 5
   */
  public append(element: ElementLike | ElementLike[]): FlickingPanel[] {
    const viewport = this.viewport;

    return viewport.insert(viewport.panelManager.getRange().max + 1, element);
  }

  /**
   * Replace existing panels with new panels from given index. If target index is empty, add new panel at target index.
   * @ko 주어진 인덱스로부터의 패널들을 새로운 패널들로 교체한다. 인덱스에 해당하는 자리가 비어있다면, 새로운 패널을 해당 자리에 집어넣는다.
   * @param index - Start index to replace new panels.<ko>새로운 패널들로 교체할 시작 인덱스</ko>
   * @param element - Either HTMLElement, HTML string, or array of them.<br>It can be also HTML string of multiple elements with same depth.<ko>HTMLElement 혹은 HTML 문자열, 혹은 그것들의 배열도 가능하다.<br>또한, 같은 depth의 여러 개의 엘리먼트에 해당하는 HTML 문자열도 가능하다.</ko>
   * @return Array of created panels by replace.<ko>교체되어 새롭게 추가된 패널들의 배열</ko>
   * @example
   * // Suppose there were no panels at initialization
   * const flicking = new eg.Flicking("#flick");
   *
   * // This will add new panel at index 3,
   * // Index 0, 1, 2 is empty at this moment.
   * // [empty, empty, empty, PANEL]
   * flicking.replace(3, document.createElement("div"));
   *
   * // As index 2 was empty, this will also add new panel at index 2.
   * // [empty, empty, PANEL, PANEL]
   * flicking.replace(2, "\<div\>Panel\</div\>");
   *
   * // Index 3 was not empty, so it will replace previous one.
   * // It will also add new panels at index 4 and 5.
   * // before - [empty, empty, PANEL, PANEL]
   * // after - [empty, empty, PANEL, NEW_PANEL, NEW_PANEL, NEW_PANEL]
   * flicking.replace(3, ["\<div\>Panel\</div\>", "\<div\>Panel\</div\>", "\<div\>Panel\</div\>"])
   */
  public replace(index: number, element: ElementLike | ElementLike[]): FlickingPanel[] {
    return this.viewport.replace(index, element);
  }

  /**
   * Remove panel at target index. This will decrease index of panels behind it.
   * @ko `index`에 해당하는 자리의 패널을 제거한다. 수행시 `index` 이후의 패널들의 인덱스가 감소된다.
   * @param index - Index of panel to remove.<ko>제거할 패널의 인덱스</ko>
   * @param {number} [deleteCount=1] - Number of panels to remove from index.<ko>`index` 이후로 제거할 패널의 개수.</ko>
   * @return Array of removed panels<ko>제거된 패널들의 배열</ko>
   */
  public remove(index: number, deleteCount: number = 1): FlickingPanel[] {
    return this.viewport.remove(index, deleteCount);
  }

  /**
   * Synchronize info of panels instance with info given by external rendering.
   * @ko 외부 렌더링 방식에 의해 입력받은 패널의 정보와 현재 플리킹이 갖는 패널 정보를 동기화한다.
   * @param - Info object of how panel elements are changed.<ko>패널의 DOM 요소들의 변경 정보를 담는 오브젝트.</ko>
   * @param -
   * @param -
   */
  public sync(diffInfo: DiffResult<HTMLElement>, origListInfo?: DiffResult<any>, prevCloneCount: number = 0): this {
    const viewport = this.viewport;
    const options = this.options;
    const panelManager = viewport.panelManager;

    const prevOriginalPanels = panelManager.originalPanels();
    const prevClonedPanels = panelManager.clonedPanels();

    const indexRange = panelManager.getRange();
    const isCircular = options.circular;

    if (!options.renderOnlyVisible || !origListInfo) {
      const { list, maintained, added, changed, removed } = diffInfo;

      // Did not changed at all
      if (added.length <= 0 && removed.length <= 0 && changed.length <= 0) {
        return this;
      }

      // Make sure that new "list" should include cloned elements
      const newOriginalPanelCount = (list.length / (panelManager.getCloneCount() + 1)) >> 0; // Make sure it's integer. Same with Math.floor, but faster
      const newCloneCount = ((list.length / newOriginalPanelCount) >> 0) - 1;

      const newOriginalElements = list.slice(0, newOriginalPanelCount);
      const newClonedElements = list.slice(newOriginalPanelCount);

      const newPanels: Panel[] = [];
      const newClones: Panel[][] = counter(newCloneCount).map(() => []);

      // For maintained panels after external rendering, they should be maintained in newPanels.
      const originalMaintained = maintained.filter(([beforeIdx, afterIdx]) => beforeIdx <= indexRange.max);
      // For newly added panels after external rendering, they will be added with their elements.
      const originalAdded = added.filter(index => index < newOriginalPanelCount);

      originalMaintained.forEach(([beforeIdx, afterIdx]) => {
        newPanels[afterIdx] = prevOriginalPanels[beforeIdx];
        newPanels[afterIdx].setIndex(afterIdx);
      });

      originalAdded.forEach(addIndex => {
        newPanels[addIndex] = new Panel(newOriginalElements[addIndex], addIndex, viewport);
      });

      if (isCircular) {
        counter(newCloneCount).forEach(groupIndex => {
          const cloneGroupOffset = newOriginalPanelCount * groupIndex;
          const prevCloneGroup = prevClonedPanels[groupIndex];
          const newCloneGroup = newClones[groupIndex];

          originalMaintained.forEach(([beforeIdx, afterIdx]) => {
            newCloneGroup[afterIdx] = prevCloneGroup
              ? prevCloneGroup[beforeIdx]
              : newPanels[afterIdx].cloneExternal(groupIndex, newClonedElements[cloneGroupOffset + afterIdx]);
          });

          originalAdded.forEach(addIndex => {
            const newPanel = newPanels[addIndex];

            newCloneGroup[addIndex] = newPanel.cloneExternal(groupIndex, newClonedElements[cloneGroupOffset + addIndex]);
          });
        });
      }

      // Replace current info of panels this holds
      added.forEach(index => { viewport.updateCheckedIndexes({ min: index, max: index }); });
      removed.forEach(index => { viewport.updateCheckedIndexes({ min: index - 1, max: index + 1 }); });

      const checkedIndexes = viewport.getCheckedIndexes();
      checkedIndexes.forEach(([min, max], idx) => {
        // Push checked indexes backward
        const pushedIndex = added.filter(index => index < min && panelManager.has(index)).length
          - removed.filter(index => index < min).length;
        checkedIndexes.splice(idx, 1, [min + pushedIndex, max + pushedIndex]);
      });

      // Only effective only when there are least one panel which have changed its index
      if (changed.length > 0) {
        // Removed checked index by changed ones after pushing
        maintained.forEach(([prev, next]) => { viewport.updateCheckedIndexes({ min: next, max: next }); });
      }

      panelManager.replacePanels(newPanels, newClones);
      viewport.resize();
    } else {
      const elements = diffInfo.list;
      const visibleIndex = viewport.getVisibleIndex();
      const panelCount = viewport.panelManager.getPanelCount();
      const cloneCount = viewport.panelManager.getCloneCount();
      origListInfo = origListInfo!;

      const prevVisibleOrigCount = visibleIndex.max - visibleIndex.min;
      const prevVisiblePanels = viewport.getVisiblePanels();

      if (origListInfo.added.length > 0 || origListInfo.removed.length > 0 || origListInfo.changed.length > 0) {
        // Panel count changed
        const newPanels: Panel[] = [];
        const newClones: Panel[][] = counter(cloneCount).map(() => []);
        const addedElements = elements.slice(prevVisibleOrigCount, prevVisibleOrigCount + origListInfo.added.length);

        origListInfo.maintained.forEach(([beforeIdx, afterIdx]) => {
          const origPanel = prevOriginalPanels[beforeIdx];
          newPanels[afterIdx] = origPanel;
          origPanel.setIndex(afterIdx);
          origPanel.getClonedPanels().forEach((panel, cloneIndex) => {
            newClones[cloneIndex][afterIdx] = panel;
          });
        });

        const addedCount = origListInfo.added.length;
        const addedCloneOffset = prevVisibleOrigCount + addedCount;
        const addedCloneElements = elements.slice(addedCloneOffset, addedCount * cloneCount);
        const addedPanels = origListInfo.added.reduce((panels, addIndex, index) => {
          newPanels[addIndex] = new Panel(addedElements[index], addIndex, viewport);
          const newPanel = newPanels[addIndex];
          if (isCircular) {
            const newClonedPanels = counter(cloneCount).map(groupIndex => {
              newClones[groupIndex][addIndex] = newPanel.cloneExternal(groupIndex, addedCloneElements[index + addedCount * groupIndex]);
              return newClones[groupIndex][addIndex];
            });
            return [...panels, newPanel, ...newClonedPanels];
          }
          return [...panels, newPanel];
        }, []);

        const newVisiblePanels = [...prevVisiblePanels, ...addedPanels];
        viewport.setVisiblePanels(newVisiblePanels);

        panelManager.replacePanels(newPanels, newClones);
        viewport.resetVisibleIndex();
        viewport.resize();
      } else if (cloneCount - prevCloneCount !== 0) {
        // Clone count changed
        if (cloneCount > prevCloneCount) {
          const newCloneElements = elements.slice(prevVisibleOrigCount, prevVisibleOrigCount + panelCount * (cloneCount - prevCloneCount));
          const newVisiblePanels = [...prevVisiblePanels];

          counter(cloneCount - prevCloneCount).forEach(offset => {
            const cloneIndex = prevCloneCount + offset;
            const newClones = prevOriginalPanels.map((panel, idx) => panel.cloneExternal(cloneIndex, newCloneElements[idx + cloneCount * offset]));

            panelManager.insertClones(cloneIndex, 0, newClones);
            newVisiblePanels.push(...newClones);
          });

          viewport.setVisiblePanels(newVisiblePanels);
        } else {
          panelManager.removeClonesAfter(cloneCount);
        }

        viewport.resetVisibleIndex();
        viewport.resize();
      } else {
        // Visible info changed
        const visiblePanels = this.viewport.calcVisiblePanels();
        const positionOffset = viewport.getPositionOffset();
        visiblePanels.forEach((panel, index) => {
          const panelEl = elements[index];
          panel.setElement(panelEl);
          panel.setPositionCSS(positionOffset);
        });
      }
    }

    return this;
  }

  private listenInput(): void {
    const flicking = this;
    const viewport = flicking.viewport;
    const stateMachine = viewport.stateMachine;

    // Set event context
    flicking.eventContext = {
      flicking,
      viewport: flicking.viewport,
      transitTo: stateMachine.transitTo,
      triggerEvent: flicking.triggerEvent,
      moveCamera: flicking.moveCamera,
      stopCamera: viewport.stopCamera,
    };

    const handlers = {};
    for (const key in AXES_EVENTS) {
      const eventType = AXES_EVENTS[key];

      handlers[eventType] = (e: any) => stateMachine.fire(eventType, e, flicking.eventContext);
    }

    // Connect Axes instance with PanInput
    flicking.viewport.connectAxesHandler(handlers);
  }

  private listenResize(): void {
    if (this.options.autoResize) {
      window.addEventListener("resize", this.resize);
    }
  }

  private triggerEvent = <T extends FlickingEvent>(
    eventName: string,
    axesEvent: any,
    isTrusted: boolean,
    params: Partial<T> = {},
  ): TriggerCallback => {
    const viewport = this.viewport;

    let canceled: boolean = true;

    // Ignore events before viewport is initialized
    if (viewport) {
      const state = viewport.stateMachine.getState();
      const { prev, next } = viewport.getScrollArea();
      const pos = viewport.getCameraPosition();
      let progress = getProgress(pos, [prev, prev, next]);

      if (this.options.circular) {
        progress %= 1;
      }
      canceled = !super.trigger(eventName, merge({
        type: eventName,
        index: this.getIndex(),
        panel: this.getCurrentPanel(),
        direction: state.direction,
        holding: state.holding,
        progress,
        axesEvent,
        isTrusted,
      }, params));
    }

    return {
      onSuccess(callback: () => void): TriggerCallback {
        if (!canceled) {
          callback();
        }
        return this;
      },
      onStopped(callback: () => void): TriggerCallback {
        if (canceled) {
          callback();
        }
        return this;
      },
    } as TriggerCallback;
  }

  // Return result of "move" event triggered
  private moveCamera = (axesEvent: any): TriggerCallback => {
    const viewport = this.viewport;
    const state = viewport.stateMachine.getState();
    const options = this.options;

    const pos = axesEvent.pos.flick;
    const previousPosition = viewport.getCameraPosition();

    if (axesEvent.isTrusted && state.holding) {
      const inputOffset = options.horizontal
        ? axesEvent.inputEvent.offsetX
        : axesEvent.inputEvent.offsetY;

      const isNextDirection = inputOffset < 0;

      let cameraChange = pos - previousPosition;
      const looped = isNextDirection === (pos < previousPosition);
      if (options.circular && looped) {
        // Reached at max/min range of axes
        const scrollAreaSize = viewport.getScrollAreaSize();
        cameraChange = (cameraChange > 0 ? -1 : 1) * (scrollAreaSize - Math.abs(cameraChange));
      }

      const currentDirection = cameraChange === 0
        ? state.direction
        : cameraChange > 0
          ? DIRECTION.NEXT
          : DIRECTION.PREV;

      state.direction = currentDirection;
    }
    state.delta += axesEvent.delta.flick;

    viewport.moveCamera(pos, axesEvent);
    return this.triggerEvent(EVENTS.MOVE, axesEvent, axesEvent.isTrusted)
      .onStopped(() => {
        // Undo camera movement
        viewport.moveCamera(previousPosition, axesEvent);
      });
  }
}

export default Flicking;
