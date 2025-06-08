// 导入 anime.js 4.0.2
import { animate } from "../node_modules/animejs/lib/anime.esm.js";

// 画布大小调整功能
function initCanvasResize() {
  const resizeBtn = document.getElementById("resizeCanvas");
  const widthInput = document.getElementById("canvasWidth");
  const heightInput = document.getElementById("canvasHeight");
  const canvas = document.getElementById("canvas");

  // 点击应用按钮时调整画布大小
  resizeBtn.addEventListener("click", () => {
    const newWidth = parseInt(widthInput.value);
    const newHeight = parseInt(heightInput.value);

    // 验证输入值
    if (newWidth < 400 || newWidth > 1200) {
      alert("画布宽度必须在400-1200之间");
      widthInput.value = canvas.offsetWidth;
      return;
    }

    if (newHeight < 300 || newHeight > 800) {
      alert("画布高度必须在300-800之间");
      heightInput.value = canvas.offsetHeight;
      return;
    }

    // 应用新的画布大小
    canvas.style.width = newWidth + "px";
    canvas.style.height = newHeight + "px";

    console.log(`画布大小已调整为: ${newWidth} x ${newHeight}`);
  });

  // 初始化输入框的值为当前画布大小
  widthInput.value = canvas.offsetWidth;
  heightInput.value = canvas.offsetHeight;
}

// 应用程序主类
class BioAnimationTool {
  constructor() {
    this.canvas = document.getElementById("canvas");
    this.propertiesPanel = document.getElementById("properties");
    this.selectedElement = null;
    this.elements = [];
    this.animations = [];
    this.isPlaying = false;

    // 添加拖拽相关属性
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };

    // 添加拖拽功能
    this.initDragAndDrop();

    // 添加路径相关属性
    this.isRecordingPath = false;
    this.currentPath = [];
    this.pathPreview = null;

    this.init();
  }

  init() {
    console.log("生物动画制作工具初始化中...");
    this.setupEventListeners();
    this.updatePropertiesPanel();
    this.updateTimelineDisplay();
    console.log("初始化完成");
  }

  setupEventListeners() {
    // 工具栏按钮事件
    document
      .getElementById("playBtn")
      .addEventListener("click", () => this.play());
    document
      .getElementById("pauseBtn")
      .addEventListener("click", () => this.pause());
    document
      .getElementById("resetBtn")
      .addEventListener("click", () => this.reset());

    // 时间轴按钮事件
    document
      .getElementById("clearTimelineBtn")
      .addEventListener("click", () => this.clearTimeline());
    document
      .getElementById("playTimelineBtn")
      .addEventListener("click", () => this.playTimeline());

    // 元素库点击事件
    const elementItems = document.querySelectorAll(".element-item");
    elementItems.forEach((item) => {
      item.addEventListener("click", (e) =>
        this.addElement(e.target.dataset.type)
      );
    });

    // 画布点击事件（取消选中）
    this.canvas.addEventListener("click", (e) => {
      if (e.target === this.canvas) {
        this.deselectElement();
        this.removeLineControls(); // 隐藏线条控制点
      }
    });
  }

  addElement(type, x = null, y = null) {
    console.log(`添加元素: ${type}`);

    const element = document.createElement("div");
    element.className = `canvas-element ${type}`;

    // 如果指定了位置，使用指定位置；否则使用随机位置
    let randomX, randomY;
    if (x !== null && y !== null) {
      // 使用指定位置，但要确保在画布范围内
      randomX = Math.max(0, Math.min(x, 600));
      randomY = Math.max(0, Math.min(y, 400));
    } else {
      // 生成随机位置
      const maxX = 600;
      const maxY = 400;
      randomX = Math.floor(Math.random() * maxX);
      randomY = Math.floor(Math.random() * maxY);
    }

    // 明确设置位置
    element.style.position = "absolute";
    element.style.left = randomX + "px";
    element.style.top = randomY + "px";

    console.log(`元素初始位置: left=${randomX}px, top=${randomY}px`);

    // 添加数据属性
    element.dataset.elementType = type;
    // 计算相同类型已有元素数
    const countOfType = this.elements.filter(
      (el) => el.dataset.elementType === type
    ).length;
    const id = `${type}_${countOfType + 1}`;
    element.dataset.elementId = id;

    this.canvas.appendChild(element);

    // 为直线和曲线创建SVG内容
    if (type === "line") {
      element.innerHTML = `
            <svg width="120" height="30" style="overflow: visible;">
                <line x1="10" y1="15" x2="110" y2="15" 
                      stroke="#2c2c54" 
                      stroke-width="2"
                      stroke-linecap="round"/>
            </svg>
        `;
      // 设置容器大小
      element.style.width = "120px";
      element.style.height = "30px";

      // 存储直线的默认参数
      element.dataset.lineStartX = "10";
      element.dataset.lineStartY = "15";
      element.dataset.lineEndX = "110";
      element.dataset.lineEndY = "15";

      element.dataset.offsetX = "0";
      element.dataset.offsetY = "0";
    }

    if (type === "curve") {
      element.innerHTML = `
            <svg width="120" height="50" style="overflow: visible;">
                <path d="M 10 35 Q 60 15 110 35" 
                      stroke="#ff4757" 
                      stroke-width="2" 
                      fill="none"
                      stroke-linecap="round"/>
            </svg>
        `;
      element.style.width = "120px";
      element.style.height = "50px";

      // 存储曲线的默认参数（改用两个控制点）
      element.dataset.curveStartX = "10";
      element.dataset.curveStartY = "35";
      element.dataset.curveControl1X = "35"; // 第一个控制点
      element.dataset.curveControl1Y = "15";
      element.dataset.curveControl2X = "85"; // 第二个控制点
      element.dataset.curveControl2Y = "15";
      element.dataset.curveEndX = "110";
      element.dataset.curveEndY = "35";

      element.dataset.offsetX = "0";
      element.dataset.offsetY = "0";
    }

    // 如果是DNA链，添加碱基对横杠
    if (type === "dna") {
      for (let i = 0; i < 8; i++) {
        const bar = document.createElement("div");
        bar.className = "base-pair";
        bar.style.top = `${10 + i * 10}px`;
        bar.style.animationDelay = `${i * 0.2}s`;
        element.appendChild(bar);
      }
    }

    this.elements.push(element);

    // 添加点击选中功能
    element.addEventListener("click", (e) => {
      e.stopPropagation();
      this.selectElement(element);
    });

    // 添加拖拽事件
    this.addDragListeners(element);

    // 重要：对于线条类型，不添加调整大小的功能
    if (type !== "line" && type !== "curve") {
      this.addResizeHandles(element);
    }
    // 自动选中新添加的元素
    this.selectElement(element);
  }

  // 初始化拖拽功能
  initDragAndDrop() {
    // 为所有元素项添加拖拽事件
    const elementItems = document.querySelectorAll(".element-item");
    elementItems.forEach((item) => {
      item.addEventListener("dragstart", this.handleDragStart.bind(this));
    });

    // 为画布添加拖拽目标事件
    this.canvas.addEventListener("dragover", this.handleDragOver.bind(this));
    this.canvas.addEventListener("drop", this.handleDrop.bind(this));
  }

  // 开始拖拽
  handleDragStart(e) {
    const elementType = e.target.dataset.type;
    e.dataTransfer.setData("text/plain", elementType);
    e.dataTransfer.effectAllowed = "copy";
  }

  // 拖拽悬停在画布上
  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  // 拖拽放置到画布
  handleDrop(e) {
    e.preventDefault();
    const elementType = e.dataTransfer.getData("text/plain");

    // 获取鼠标在画布中的位置
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 创建元素
    console.log(`拖拽位置: x=${x}, y=${y}`);

    // 调用原有的addElement方法，但传递位置参数
    this.addElementAtPosition(elementType, x, y);
  }

  // 在指定位置添加元素（供拖拽使用）
  addElementAtPosition(type, x, y) {
    this.addElement(type, x, y);
  }

  selectElement(element) {
    // 移除之前选中的元素的选中状态
    this.deselectElement();

    // 选中新元素
    this.selectedElement = element;
    element.classList.add("selected");

    // 添加删除按钮
    this.addDeleteButton(element);

    // 如果是直线或曲线，添加专用控制点
    const type = element.dataset.elementType;
    if (type === "line" || type === "curve") {
      this.addLineControls(element);
    } else {
      // 其他元素添加调整大小的控制点
      this.addResizeHandles(element);
    }

    console.log("选中元素:", element.dataset.elementId);
    console.log("当前位置:", {
      left: element.style.left,
      top: element.style.top,
    });

    this.updatePropertiesPanel();
  }

  // 为选中的元素添加删除按钮
  addDeleteButton(element) {
    // 如果已经有删除按钮，先移除
    this.removeDeleteButton();

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.innerHTML = "×";
    deleteBtn.title = "删除元素";

    // 设置删除按钮的样式
    deleteBtn.style.position = "absolute";
    deleteBtn.style.top = "-10px";
    deleteBtn.style.right = "-10px";
    deleteBtn.style.width = "20px";
    deleteBtn.style.height = "20px";
    deleteBtn.style.borderRadius = "50%";
    deleteBtn.style.border = "none";
    deleteBtn.style.backgroundColor = "#ff4757";
    deleteBtn.style.color = "white";
    deleteBtn.style.fontSize = "14px";
    deleteBtn.style.fontWeight = "bold";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.style.display = "flex";
    deleteBtn.style.alignItems = "center";
    deleteBtn.style.justifyContent = "center";
    deleteBtn.style.zIndex = "1000";

    // 添加点击事件
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // 防止触发元素的点击事件
      this.deleteElement(element);
    });

    // 将删除按钮添加到元素中
    element.appendChild(deleteBtn);

    // 保存删除按钮的引用
    this.currentDeleteBtn = deleteBtn;
  }

  // 移除删除按钮
  removeDeleteButton() {
    if (this.currentDeleteBtn) {
      this.currentDeleteBtn.remove();
      this.currentDeleteBtn = null;
    }
  }

  // 删除元素
  deleteElement(element) {
    if (!element) return;

    // 从elements数组中移除
    const index = this.elements.indexOf(element);
    if (index > -1) {
      this.elements.splice(index, 1);
    }

    // 从DOM中移除
    element.remove();

    // 清除选中状态
    this.selectedElement = null;
    this.removeDeleteButton();

    console.log("删除了元素:", element.dataset.elementType);
  }

  clearSelection() {
    // 移除所有选中状态
    const selectedElements = document.querySelectorAll(
      ".canvas-element.selected"
    );
    selectedElements.forEach((el) => el.classList.remove("selected"));

    // 移除删除按钮
    this.removeDeleteButton();

    // 移除线条控制点
    this.removeLineControls();

    // 清空选中元素引用
    this.selectedElement = null;

    console.log("清除选中状态");
  }

  addResizeHandles(element) {
    // 创建8个调整手柄（四角 + 四边）
    const handles = [
      {
        name: "nw",
        cursor: "nw-resize",
        position: { top: "-5px", left: "-5px" },
      },
      {
        name: "n",
        cursor: "n-resize",
        position: { top: "-5px", left: "50%", transform: "translateX(-50%)" },
      },
      {
        name: "ne",
        cursor: "ne-resize",
        position: { top: "-5px", right: "-5px" },
      },
      {
        name: "e",
        cursor: "e-resize",
        position: { top: "50%", right: "-5px", transform: "translateY(-50%)" },
      },
      {
        name: "se",
        cursor: "se-resize",
        position: { bottom: "-5px", right: "-5px" },
      },
      {
        name: "s",
        cursor: "s-resize",
        position: {
          bottom: "-5px",
          left: "50%",
          transform: "translateX(-50%)",
        },
      },
      {
        name: "sw",
        cursor: "sw-resize",
        position: { bottom: "-5px", left: "-5px" },
      },
      {
        name: "w",
        cursor: "w-resize",
        position: { top: "50%", left: "-5px", transform: "translateY(-50%)" },
      },
    ];

    handles.forEach((handle) => {
      const resizeHandle = document.createElement("div");
      resizeHandle.className = "resize-handle";
      resizeHandle.dataset.direction = handle.name;
      resizeHandle.style.cursor = handle.cursor;

      // 设置手柄位置
      Object.keys(handle.position).forEach((prop) => {
        resizeHandle.style[prop] = handle.position[prop];
      });

      element.appendChild(resizeHandle);
      this.addResizeListener(element, resizeHandle, handle.name);
    });
  }

  addResizeListener(element, handle, direction) {
    let isResizing = false;
    let startX, startY, startWidth, startHeight, startLeft, startTop;

    handle.addEventListener("mousedown", (e) => {
      e.stopPropagation(); // 防止触发拖拽
      isResizing = true;

      startX = e.clientX;
      startY = e.clientY;
      startWidth = parseInt(
        document.defaultView.getComputedStyle(element).width,
        10
      );
      startHeight = parseInt(
        document.defaultView.getComputedStyle(element).height,
        10
      );
      startLeft = parseInt(element.style.left, 10) || 0;
      startTop = parseInt(element.style.top, 10) || 0;

      document.addEventListener("mousemove", doResize);
      document.addEventListener("mouseup", stopResize);
    });

    const doResize = (e) => {
      if (!isResizing) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newLeft = startLeft;
      let newTop = startTop;

      // 根据拖拽方向调整尺寸和位置
      switch (direction) {
        case "se": // 东南角
          newWidth = startWidth + dx;
          newHeight = startHeight + dy;
          break;
        case "sw": // 西南角
          newWidth = startWidth - dx;
          newHeight = startHeight + dy;
          newLeft = startLeft + dx;
          break;
        case "ne": // 东北角
          newWidth = startWidth + dx;
          newHeight = startHeight - dy;
          newTop = startTop + dy;
          break;
        case "nw": // 西北角
          newWidth = startWidth - dx;
          newHeight = startHeight - dy;
          newLeft = startLeft + dx;
          newTop = startTop + dy;
          break;
        case "n": // 北边
          newHeight = startHeight - dy;
          newTop = startTop + dy;
          break;
        case "s": // 南边
          newHeight = startHeight + dy;
          break;
        case "e": // 东边
          newWidth = startWidth + dx;
          break;
        case "w": // 西边
          newWidth = startWidth - dx;
          newLeft = startLeft + dx;
          break;
      }

      // 限制最小尺寸
      newWidth = Math.max(20, newWidth);
      newHeight = Math.max(20, newHeight);

      // 限制在画布范围内
      const maxWidth = this.canvas.offsetWidth - newLeft;
      const maxHeight = this.canvas.offsetHeight - newTop;
      newWidth = Math.min(newWidth, maxWidth);
      newHeight = Math.min(newHeight, maxHeight);

      // 应用新的尺寸和位置
      element.style.width = newWidth + "px";
      element.style.height = newHeight + "px";
      element.style.left = newLeft + "px";
      element.style.top = newTop + "px";

      // 更新属性面板
      if (this.selectedElement === element) {
        this.updatePropertyInputs(newLeft, newTop);
        const widthInput = document.getElementById("elementWidth");
        const heightInput = document.getElementById("elementHeight");
        if (widthInput) widthInput.value = newWidth;
        if (heightInput) heightInput.value = newHeight;
      }
    };

    const stopResize = () => {
      isResizing = false;
      document.removeEventListener("mousemove", doResize);
      document.removeEventListener("mouseup", stopResize);
    };
  }

  // 为直线和曲线添加控制点
  addLineControls(element) {
    const type = element.dataset.elementType;

    if (type === "line") {
      this.addLineEndpoints(element);
    } else if (type === "curve") {
      this.addCurveControlPoints(element);
    }
  }

  // 为直线添加端点控制
  addLineEndpoints(element) {
    // 移除现有控制点
    this.removeLineControls();

    const rect = element.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();

    // 获取元素在画布中的位置
    const elementLeft = parseInt(element.style.left) || 0;
    const elementTop = parseInt(element.style.top) || 0;

    const startX = parseInt(element.dataset.lineStartX);
    const startY = parseInt(element.dataset.lineStartY);
    const endX = parseInt(element.dataset.lineEndX);
    const endY = parseInt(element.dataset.lineEndY);

    // 计算控制点在画布中的绝对位置
    const offsetX = parseInt(element.dataset.offsetX) || 0;
    const offsetY = parseInt(element.dataset.offsetY) || 0;

    // 创建起点控制点
    const startPoint = this.createControlPoint(
      elementLeft + startX - offsetX,
      elementTop + startY - offsetY,
      "line-start"
    );

    // 创建终点控制点
    const endPoint = this.createControlPoint(
      elementLeft + endX - offsetX,
      elementTop + endY - offsetY,
      "line-end"
    );

    this.currentLineControls = [startPoint, endPoint];

    // 添加拖拽事件
    this.addControlPointDrag(startPoint, element, "start");
    this.addControlPointDrag(endPoint, element, "end");
  }

  // 为曲线添加控制点（4个控制点版本）
  addCurveControlPoints(element) {
    // 移除现有控制点
    this.removeLineControls();

    const rect = element.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();

    // 获取元素在画布中的位置
    const elementLeft = parseInt(element.style.left) || 0;
    const elementTop = parseInt(element.style.top) || 0;

    const startX = parseInt(element.dataset.curveStartX);
    const startY = parseInt(element.dataset.curveStartY);
    const control1X = parseInt(element.dataset.curveControl1X);
    const control1Y = parseInt(element.dataset.curveControl1Y);
    const control2X = parseInt(element.dataset.curveControl2X);
    const control2Y = parseInt(element.dataset.curveControl2Y);
    const endX = parseInt(element.dataset.curveEndX);
    const endY = parseInt(element.dataset.curveEndY);

    // 计算控制点在画布中的绝对位置
    const offsetX = parseInt(element.dataset.offsetX) || 0;
    const offsetY = parseInt(element.dataset.offsetY) || 0;

    // 创建4个控制点
    const startPoint = this.createControlPoint(
      elementLeft + startX - offsetX,
      elementTop + startY - offsetY,
      "curve-start"
    );

    const control1Point = this.createControlPoint(
      elementLeft + control1X - offsetX,
      elementTop + control1Y - offsetY,
      "curve-control1"
    );

    const control2Point = this.createControlPoint(
      elementLeft + control2X - offsetX,
      elementTop + control2Y - offsetY,
      "curve-control2"
    );

    const endPoint = this.createControlPoint(
      elementLeft + endX - offsetX,
      elementTop + endY - offsetY,
      "curve-end"
    );

    this.currentLineControls = [
      startPoint,
      control1Point,
      control2Point,
      endPoint,
    ];

    // 添加拖拽事件
    this.addControlPointDrag(startPoint, element, "curve-start");
    this.addControlPointDrag(control1Point, element, "curve-control1");
    this.addControlPointDrag(control2Point, element, "curve-control2");
    this.addControlPointDrag(endPoint, element, "curve-end");
  }

  // 创建控制点
  createControlPoint(x, y, type) {
    const point = document.createElement("div");
    point.className = `line-control-point ${type}`;
    point.style.position = "absolute";
    point.style.width = "12px";
    point.style.height = "12px";

    // 更新颜色逻辑以支持两个控制点
    if (type === "curve-control1" || type === "curve-control2") {
      point.style.backgroundColor = "#ff4757";
    } else {
      point.style.backgroundColor = "#007bff";
    }

    point.style.border = "2px solid white";
    point.style.borderRadius = "50%";
    point.style.cursor = "move";
    point.style.left = x - 6 + "px";
    point.style.top = y - 6 + "px";
    point.style.zIndex = "1001";

    // 添加一个更大的透明点击区域
    const clickArea = document.createElement("div");
    clickArea.style.position = "absolute";
    clickArea.style.width = "20px"; // 更大的点击区域
    clickArea.style.height = "20px";
    clickArea.style.left = "-4px"; // 居中对齐
    clickArea.style.top = "-4px";
    clickArea.style.cursor = "move";
    clickArea.style.zIndex = "1002"; // 确保在最上层

    this.canvas.appendChild(point);
    return point;
  }

  // 移除线条控制点
  removeLineControls() {
    if (this.currentLineControls) {
      this.currentLineControls.forEach((point) => point.remove());
      this.currentLineControls = null;
    }
  }

  // 为控制点添加拖拽事件
  addControlPointDrag(controlPoint, lineElement, pointType) {
    let isDragging = false;
    let startX, startY;

    // 获取点击区域（如果存在）或使用控制点本身
    const clickTarget = controlPoint.querySelector("div") || controlPoint;

    clickTarget.addEventListener("mousedown", (e) => {
      e.stopPropagation(); // 阻止事件冒泡，避免选中曲线
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      controlPoint.style.backgroundColor = "#ff6b6b"; // 拖拽时改变颜色
    });

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;

      e.preventDefault();
      e.stopPropagation(); // 阻止事件冒泡

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      // 获取画布边界，限制控制点在画布内
      const canvasRect = this.canvas.getBoundingClientRect();
      const currentLeft = parseInt(controlPoint.style.left);
      const currentTop = parseInt(controlPoint.style.top);

      const newLeft = currentLeft + deltaX;
      const newTop = currentTop + deltaY;

      // 边界检查（调整边界值，因为控制点变大了）
      if (
        newLeft >= -6 &&
        newLeft <= canvasRect.width - 6 &&
        newTop >= -6 &&
        newTop <= canvasRect.height - 6
      ) {
        // 更新控制点位置
        controlPoint.style.left = newLeft + "px";
        controlPoint.style.top = newTop + "px";

        // 只更新线条形状，不移动线条整体位置
        this.updateLineShapeOnly(lineElement, pointType, deltaX, deltaY);
      }

      startX = e.clientX;
      startY = e.clientY;
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        // 恢复控制点颜色
        if (pointType === "curve-control1" || pointType === "curve-control2") {
          controlPoint.style.backgroundColor = "#ff4757";
        } else {
          controlPoint.style.backgroundColor = "#007bff";
        }
      }
    });
  }

  // 同步移动控制点位置
  syncLineControlPoints(element, deltaX, deltaY) {
    if (this.currentLineControls && this.selectedElement === element) {
      this.currentLineControls.forEach((controlPoint) => {
        const currentLeft = parseInt(controlPoint.style.left);
        const currentTop = parseInt(controlPoint.style.top);
        controlPoint.style.left = currentLeft + deltaX + "px";
        controlPoint.style.top = currentTop + deltaY + "px";
      });
    }
  }

  // 只更新线条形状，不改变整体位置
  updateLineShapeOnly(element, pointType, deltaX, deltaY) {
    const type = element.dataset.elementType;

    if (type === "line") {
      this.updateLineGeometryOnly(element, pointType, deltaX, deltaY);
    } else if (type === "curve") {
      this.updateCurveGeometryOnly(element, pointType, deltaX, deltaY);
    }
  }

  // 只更新直线几何形状，不改变整体位置
  updateLineGeometryOnly(element, pointType, deltaX, deltaY) {
    let startX = parseInt(element.dataset.lineStartX);
    let startY = parseInt(element.dataset.lineStartY);
    let endX = parseInt(element.dataset.lineEndX);
    let endY = parseInt(element.dataset.lineEndY);

    // 根据控制点类型更新对应的坐标
    if (pointType === "start") {
      startX += deltaX;
      startY += deltaY;
    } else if (pointType === "end") {
      endX += deltaX;
      endY += deltaY;
    }

    // 更新数据属性
    element.dataset.lineStartX = startX;
    element.dataset.lineStartY = startY;
    element.dataset.lineEndX = endX;
    element.dataset.lineEndY = endY;

    // 重新计算SVG范围
    const minX = Math.min(startX, endX) - 10;
    const maxX = Math.max(startX, endX) + 10;
    const minY = Math.min(startY, endY) - 10;
    const maxY = Math.max(startY, endY) + 10;

    const width = maxX - minX;
    const height = maxY - minY;

    // 调整坐标相对于新的SVG边界
    const adjustedStartX = startX - minX;
    const adjustedStartY = startY - minY;
    const adjustedEndX = endX - minX;
    const adjustedEndY = endY - minY;

    // 更新SVG元素
    const svg = element.querySelector("svg");
    const line = element.querySelector("line");

    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    line.setAttribute("x1", adjustedStartX);
    line.setAttribute("y1", adjustedStartY);
    line.setAttribute("x2", adjustedEndX);
    line.setAttribute("y2", adjustedEndY);

    // 更新元素尺寸
    element.style.width = width + "px";
    element.style.height = height + "px";

    // 计算元素位置偏移
    const offsetX = minX - parseInt(element.dataset.offsetX || 0);
    const offsetY = minY - parseInt(element.dataset.offsetY || 0);

    if (offsetX !== 0 || offsetY !== 0) {
      const currentLeft = parseInt(element.style.left);
      const currentTop = parseInt(element.style.top);
      element.style.left = currentLeft + offsetX + "px";
      element.style.top = currentTop + offsetY + "px";
    }

    // 更新偏移记录
    element.dataset.offsetX = minX;
    element.dataset.offsetY = minY;
  }

  // 只更新曲线几何形状，不改变整体位置
  updateCurveGeometryOnly(element, pointType, deltaX, deltaY) {
    let startX = parseInt(element.dataset.curveStartX);
    let startY = parseInt(element.dataset.curveStartY);
    let control1X = parseInt(element.dataset.curveControl1X);
    let control1Y = parseInt(element.dataset.curveControl1Y);
    let control2X = parseInt(element.dataset.curveControl2X);
    let control2Y = parseInt(element.dataset.curveControl2Y);
    let endX = parseInt(element.dataset.curveEndX);
    let endY = parseInt(element.dataset.curveEndY);

    // 根据控制点类型更新对应的坐标
    if (pointType === "curve-start") {
      startX += deltaX;
      startY += deltaY;
    } else if (pointType === "curve-control1") {
      control1X += deltaX;
      control1Y += deltaY;
    } else if (pointType === "curve-control2") {
      control2X += deltaX;
      control2Y += deltaY;
    } else if (pointType === "curve-end") {
      endX += deltaX;
      endY += deltaY;
    }

    // 更新数据属性
    element.dataset.curveStartX = startX;
    element.dataset.curveStartY = startY;
    element.dataset.curveControl1X = control1X;
    element.dataset.curveControl1Y = control1Y;
    element.dataset.curveControl2X = control2X;
    element.dataset.curveControl2Y = control2Y;
    element.dataset.curveEndX = endX;
    element.dataset.curveEndY = endY;

    // 重新计算SVG范围
    const minX = Math.min(startX, control1X, control2X, endX) - 10;
    const maxX = Math.max(startX, control1X, control2X, endX) + 10;
    const minY = Math.min(startY, control1Y, control2Y, endY) - 10;
    const maxY = Math.max(startY, control1Y, control2Y, endY) + 10;

    const width = maxX - minX;
    const height = maxY - minY;

    // 调整坐标
    const adjustedStartX = startX - minX;
    const adjustedStartY = startY - minY;
    const adjustedControl1X = control1X - minX;
    const adjustedControl1Y = control1Y - minY;
    const adjustedControl2X = control2X - minX;
    const adjustedControl2Y = control2Y - minY;
    const adjustedEndX = endX - minX;
    const adjustedEndY = endY - minY;

    // 更新SVG元素
    const svg = element.querySelector("svg");
    const path = element.querySelector("path");

    svg.setAttribute("width", width);
    svg.setAttribute("height", height);

    // 使用三次贝塞尔曲线（C命令）而不是二次贝塞尔曲线（Q命令）
    const pathData = `M ${adjustedStartX} ${adjustedStartY} C ${adjustedControl1X} ${adjustedControl1Y}, ${adjustedControl2X} ${adjustedControl2Y}, ${adjustedEndX} ${adjustedEndY}`;
    path.setAttribute("d", pathData);

    // 更新元素尺寸
    element.style.width = width + "px";
    element.style.height = height + "px";

    // 计算元素位置偏移
    const offsetX = minX - parseInt(element.dataset.offsetX || 0);
    const offsetY = minY - parseInt(element.dataset.offsetY || 0);

    if (offsetX !== 0 || offsetY !== 0) {
      const currentLeft = parseInt(element.style.left);
      const currentTop = parseInt(element.style.top);
      element.style.left = currentLeft + offsetX + "px";
      element.style.top = currentTop + offsetY + "px";
    }

    // 更新偏移记录
    element.dataset.offsetX = minX;
    element.dataset.offsetY = minY;

    // 只有在真正重新定位时才同步控制点
    if (this.currentLineControls && this.selectedElement === element) {
      this.syncCurveControlPointsAfterResize(element, offsetX, offsetY);
    } else {
      // 没有重新定位时，仍需要更新偏移记录
      element.dataset.offsetX = minX;
      element.dataset.offsetY = minY;
    }
  }

  // 曲线重新定位后同步控制点位置
  syncCurveControlPointsAfterResize(element, offsetX, offsetY) {
    console.log("=== 重新计算控制点位置 ===");
    console.log("曲线重新定位偏移:", offsetX, offsetY);

    // 确保只在真正需要时执行
    if (offsetX === 0 && offsetY === 0) {
      console.log("无偏移，跳过同步");
      return;
    }

    // 获取曲线当前的位置和数据
    const elementLeft = parseInt(element.style.left);
    const elementTop = parseInt(element.style.top);

    const startX = parseInt(element.dataset.curveStartX);
    const startY = parseInt(element.dataset.curveStartY);
    const control1X = parseInt(element.dataset.curveControl1X);
    const control1Y = parseInt(element.dataset.curveControl1Y);
    const control2X = parseInt(element.dataset.curveControl2X);
    const control2Y = parseInt(element.dataset.curveControl2Y);
    const endX = parseInt(element.dataset.curveEndX);
    const endY = parseInt(element.dataset.curveEndY);

    const currentOffsetX = parseInt(element.dataset.offsetX) || 0;
    const currentOffsetY = parseInt(element.dataset.offsetY) || 0;

    console.log("元素位置:", elementLeft, elementTop);
    console.log(
      "曲线数据坐标 - start:",
      startX,
      startY,
      "control:",
      controlX,
      controlY,
      "end:",
      endX,
      endY
    );
    console.log("当前偏移:", currentOffsetX, currentOffsetY);

    // 重新设置每个控制点的位置
    if (this.currentLineControls[0]) {
      // 起点
      const newLeft = elementLeft + startX - currentOffsetX;
      const newTop = elementTop + startY - currentOffsetY;
      this.currentLineControls[0].style.left = newLeft - 4 + "px";
      this.currentLineControls[0].style.top = newTop - 4 + "px";
      console.log("起点控制点位置:", newLeft - 4, newTop - 4);
    }

    if (this.currentLineControls[1]) {
      // 第一个控制点
      const newLeft = elementLeft + control1X - currentOffsetX;
      const newTop = elementTop + control1Y - currentOffsetY;
      this.currentLineControls[1].style.left = newLeft - 4 + "px";
      this.currentLineControls[1].style.top = newTop - 4 + "px";
      console.log("第一个控制点位置:", newLeft - 4, newTop - 4);
    }

    if (this.currentLineControls[2]) {
      // 第二个控制点
      const newLeft = elementLeft + control2X - currentOffsetX;
      const newTop = elementTop + control2Y - currentOffsetY;
      this.currentLineControls[2].style.left = newLeft - 4 + "px";
      this.currentLineControls[2].style.top = newTop - 4 + "px";
      console.log("第二个控制点位置:", newLeft - 4, newTop - 4);
    }

    if (this.currentLineControls[3]) {
      // 终点
      const newLeft = elementLeft + endX - currentOffsetX;
      const newTop = elementTop + endY - currentOffsetY;
      this.currentLineControls[3].style.left = newLeft - 4 + "px";
      this.currentLineControls[3].style.top = newTop - 4 + "px";
      console.log("终点控制点位置:", newLeft - 4, newTop - 4);
    }

    console.log("=== 重新计算完成 ===");
  }

  // 清除元素的选中状态
  deselectElement() {
    if (this.selectedElement) {
      this.selectedElement.classList.remove("selected");
      this.selectedElement = null;
      this.updatePropertiesPanel();
      this.removeDeleteButton();
    }
  }

  // 更新属性面板
  updatePropertiesPanel() {
    if (this.selectedElement) {
      const type = this.selectedElement.dataset.elementType;
      const typeLabel =
        document.querySelector(`.element-item[data-type="${type}"]`)
          ?.innerText || type;
      const id = this.selectedElement.dataset.elementId;
      const rect = this.selectedElement.getBoundingClientRect();
      const canvasRect = this.canvas.getBoundingClientRect();

      // 计算相对于画布的位置
      const x = parseInt(this.selectedElement.style.left) || 0;
      const y = parseInt(this.selectedElement.style.top) || 0;

      this.propertiesPanel.innerHTML = `
            <div class="property-group">
              <div class="property-group-header" onclick="app.togglePropertyGroup(this)">
                  <h4>基本信息</h4>
                  <span class="property-group-toggle">▼</span>
              </div>
              <div class="property-group-content">
                  <div class="property-row">
                      <label>类型:</label>
                      <span>${typeLabel}</span>
                  </div>
                  <div class="property-row">
                      <label>ID:</label>
                      <span>${id}</span>
                  </div>
              </div>
            </div>
            
            <div class="property-group">
              <div class="property-group-header" onclick="app.togglePropertyGroup(this)">
                <h4>位置属性</h4>
                <span class="property-group-toggle">▼</span>
              </div>
              <div class="property-group-content">
                <div class="property-row">
                    <label>X坐标:</label>
                    <input type="number" id="posX" value="${x}" min="0" max="740">
                </div>
                <div class="property-row">
                  <label>Y坐标:</label>
                  <input type="number" id="posY" value="${y}" min="0" max="540">
                </div>
              </div>
            </div>

            <div class="property-group">
              <div class="property-group-header" onclick="app.togglePropertyGroup(this)">
                <h4>尺寸设置</h4>
                <span class="property-group-toggle">▼</span>
              </div>
              <div class="property-group-content">
                <div class="property-row">
                  <label>宽度:</label>
                  <input type="number" id="elementWidth" value="${this.selectedElement.offsetWidth}" min="10" max="500">
                </div>
                <div class="property-row">
                  <label>高度:</label>
                  <input type="number" id="elementHeight" value="${this.selectedElement.offsetHeight}" min="10" max="500">
                </div>
              </div>
            </div>

            <div class="property-group">
              <div class="property-group-header" onclick="app.togglePropertyGroup(this)">
                <h4>动画设置</h4>
                <span class="property-group-toggle">▼</span>
              </div>
              <div class="property-group-content">
                <div class="property-row">
                    <label>目标X:</label>
                    <input type="number" id="targetX" value="${x}" min="0" max="740">
                </div>
                <div class="property-row">
                    <label>目标Y:</label>
                    <input type="number" id="targetY" value="${y}" min="0" max="540">
                </div>
                <div class="property-row">
                    <label>持续时间(ms):</label>
                    <input type="number" id="duration" value="1000" min="100" max="10000" step="100">
                </div>
                <div class="property-row">
                    <label>缓动函数:</label>
                    <select id="easing">
                        <option value="linear">线性</option>
                        <option value="easeInOutQuad" selected>二次缓动</option>
                        <option value="easeInOutCubic">三次缓动</option>
                        <option value="easeInOutElastic">弹性缓动</option>
                        <option value="easeInOutBounce">弹跳缓动</option>
                    </select>
                </div>
              </div>
            </div>

            <div class="property-group">
              <div class="property-group-header" onclick="app.togglePropertyGroup(this)">
                <h4>路径动画</h4>
                <span class="property-group-toggle">▼</span>
              </div>
              <div class="property-group-content">
                <div class="property-row">
                    <button onclick="app.startRecordingPath()" style="background-color: #9b59b6; width: 48%;">记录路径</button>
                    <button onclick="app.stopRecordingPath()" style="background-color: #95a5a6; width: 48%;">停止记录</button>
                </div>
                <div class="property-row">
                    <button onclick="app.clearPath()" style="background-color: #e67e22; width: 48%;">清除路径</button>
                    <button onclick="app.playPath()" style="background-color: #27ae60; width: 48%;">播放路径</button>
                </div>
                <div class="property-row">
                    <label>路径点数:</label>
                    <span id="pathPointCount">0</span>
                </div>
              </div>
            </div>
            
            <div class="property-group">
              <div class="property-group-header" onclick="app.togglePropertyGroup(this)">
                <h4>元素操作</h4>
                <span class="property-group-toggle">▼</span>
              </div>
              <div class="property-group-content">
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <button onclick="app.updatePosition()" style="background-color: #27ae60;">更新位置</button>
                    <button onclick="app.previewAnimation()" style="background-color: #3498db;">预览动画</button>
                    <button onclick="app.addToTimeline()" style="background-color: #f39c12;">添加到时间轴</button>
                    <button onclick="app.deleteElement()" style="background-color: #e74c3c;">删除元素</button>
                </div>
              </div>
            </div>
        `;

      // 绑定输入框事件
      this.bindPropertyInputs();
    } else {
      this.propertiesPanel.innerHTML = "<p>选择一个元素来编辑属性</p>";
    }
  }

  // 切换属性组展开/收起状态
  togglePropertyGroup(header) {
    const propertyGroup = header.parentElement;
    const toggle = header.querySelector(".property-group-toggle");

    propertyGroup.classList.toggle("collapsed");

    if (propertyGroup.classList.contains("collapsed")) {
      toggle.textContent = "▶";
    } else {
      toggle.textContent = "▼";
    }
  }

  testAnimation() {
    if (this.selectedElement) {
      console.log("测试动画");

      // 使用 Anime.js 4.0.2 的正确语法
      animate(this.selectedElement, {
        translateX: 200,
        duration: 1000,
        easing: "easeInOutQuad",
      });
    }
  }

  play() {
    console.log("播放动画");
    this.isPlaying = true;
  }

  pause() {
    console.log("暂停动画");
    this.isPlaying = false;
  }

  reset() {
    console.log("重置动画");
    this.isPlaying = false;

    // 重置所有元素位置
    this.elements.forEach((element) => {
      element.style.transform = "";
    });
  }

  addDragListeners(element) {
    element.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return; // 只响应左键

      this.isDragging = true;

      // 确保元素被选中
      if (this.selectedElement !== element) {
        this.selectElement(element);
      }

      const rect = element.getBoundingClientRect();
      const canvasRect = this.canvas.getBoundingClientRect();

      // 计算鼠标相对于元素的偏移
      this.dragOffset.x = e.clientX - rect.left;
      this.dragOffset.y = e.clientY - rect.top;

      element.style.cursor = "grabbing";

      // 为线条元素初始化位置记录
      const elementType = element.dataset.elementType;
      if (elementType === "line" || elementType === "curve") {
        const currentLeft = parseInt(element.style.left) || 0;
        const currentTop = parseInt(element.style.top) || 0;
        element.dataset.previousX = currentLeft;
        element.dataset.previousY = currentTop;
      }

      console.log("开始拖拽:", {
        elementPos: { left: element.style.left, top: element.style.top },
        mouseOffset: this.dragOffset,
      });
    });

    document.addEventListener("mousemove", (e) => {
      if (!this.isDragging || this.selectedElement !== element) return;

      const canvasRect = this.canvas.getBoundingClientRect();

      // 计算新位置（相对于画布）
      const newX = e.clientX - canvasRect.left - this.dragOffset.x;
      const newY = e.clientY - canvasRect.top - this.dragOffset.y;

      // 获取元素的实际尺寸
      const elementWidth = element.offsetWidth;
      const elementHeight = element.offsetHeight;

      // 限制在画布范围内（各自再减去3，是因为发现元素拖动到画布最右或者最下边时，元素的右边缘和下边缘有一点点被挡住）
      const maxX = this.canvas.offsetWidth - elementWidth - 3;
      const maxY = this.canvas.offsetHeight - elementHeight - 3;

      const clampedX = Math.max(0, Math.min(newX, maxX));
      const clampedY = Math.max(0, Math.min(newY, maxY));

      // 设置新位置
      element.style.left = clampedX + "px";
      element.style.top = clampedY + "px";

      // 如果是线条元素，同步移动控制点
      const elementType = element.dataset.elementType;
      if (elementType === "line" || elementType === "curve") {
        // 计算实际移动的距离
        const previousX = parseInt(element.dataset.previousX || clampedX);
        const previousY = parseInt(element.dataset.previousY || clampedY);
        const deltaX = clampedX - previousX;
        const deltaY = clampedY - previousY;

        if (deltaX !== 0 || deltaY !== 0) {
          this.syncLineControlPoints(element, deltaX, deltaY);
        }

        // 记录当前位置供下次计算使用
        element.dataset.previousX = clampedX;
        element.dataset.previousY = clampedY;

        // 实时更新属性面板
        this.updatePropertyInputs(clampedX, clampedY);
      }
    });

    document.addEventListener("mouseup", () => {
      if (this.isDragging) {
        this.isDragging = false;
        element.style.cursor = "move";

        console.log("拖拽结束:", {
          finalPos: { left: element.style.left, top: element.style.top },
        });
      }
    });
  }

  bindPropertyInputs() {
    // 位置输入框实时更新
    const posXInput = document.getElementById("posX");
    const posYInput = document.getElementById("posY");

    if (posXInput) {
      posXInput.addEventListener("input", () => {
        this.selectedElement.style.left = posXInput.value + "px";
      });
    }

    if (posYInput) {
      posYInput.addEventListener("input", () => {
        this.selectedElement.style.top = posYInput.value + "px";
      });
    }

    // 尺寸输入框绑定
    const widthInput = document.getElementById("elementWidth");
    const heightInput = document.getElementById("elementHeight");

    if (widthInput) {
      widthInput.addEventListener("input", () => {
        this.selectedElement.style.width = widthInput.value + "px";
      });
    }

    if (heightInput) {
      heightInput.addEventListener("input", () => {
        this.selectedElement.style.height = heightInput.value + "px";
      });
    }
  }

  updatePosition() {
    if (!this.selectedElement) return;

    const posX = document.getElementById("posX").value;
    const posY = document.getElementById("posY").value;

    this.selectedElement.style.left = posX + "px";
    this.selectedElement.style.top = posY + "px";

    console.log(`位置更新为: (${posX}, ${posY})`);
  }

  previewAnimation() {
    if (!this.selectedElement) return;

    const targetX = document.getElementById("targetX").value;
    const targetY = document.getElementById("targetY").value;
    const duration = document.getElementById("duration").value;
    const easing = document.getElementById("easing").value;

    console.log("预览动画:", { targetX, targetY, duration, easing });

    animate(this.selectedElement, {
      left: targetX + "px",
      top: targetY + "px",
      duration: parseInt(duration),
      easing: easing,
    });
  }

  addToTimeline() {
    if (!this.selectedElement) return;

    const targetX = document.getElementById("targetX").value;
    const targetY = document.getElementById("targetY").value;
    const duration = document.getElementById("duration").value;
    const easing = document.getElementById("easing").value;

    // 创建动画配置对象
    const animationConfig = {
      element: this.selectedElement,
      elementId: this.selectedElement.dataset.elementId,
      targetX: parseInt(targetX),
      targetY: parseInt(targetY),
      duration: parseInt(duration),
      easing: easing,
      timestamp: Date.now(),
    };

    this.animations.push(animationConfig);
    this.updateTimelineDisplay();

    console.log("动画已添加到时间轴:", animationConfig);
    console.log("当前时间轴:", this.animations);
  }

  deleteElement() {
    if (!this.selectedElement) return;

    const elementId = this.selectedElement.dataset.elementId;
    const elementType = this.selectedElement.dataset.elementType;

    // 如果删除的是线条元素，先移除控制点
    if (elementType === "line" || elementType === "curve") {
      this.removeLineControls();
    }

    // 从DOM中移除
    this.selectedElement.remove();

    // 从elements数组中移除
    this.elements = this.elements.filter(
      (el) => el.dataset.elementId !== elementId
    );

    // 从animations数组中移除相关动画
    this.animations = this.animations.filter(
      (anim) => anim.elementId !== elementId
    );

    // 清空选择
    this.selectedElement = null;
    this.updatePropertiesPanel();

    console.log("元素已删除:", elementId);
  }

  updateTimelineDisplay() {
    const timeline = document.getElementById("timeline");

    if (this.animations.length === 0) {
      timeline.innerHTML =
        '<p class="timeline-empty">时间轴为空，请添加动画</p>';
    } else {
      timeline.innerHTML = this.animations
        .map(
          (anim, index) => `
            <div class="timeline-item">
                <div class="timeline-item-info">
                    <div class="timeline-item-title">动画 ${index + 1}: ${
            anim.elementId
          }</div>
                    <div class="timeline-item-details">
                        目标位置: (${anim.targetX}, ${anim.targetY}) | 
                        持续时间: ${anim.duration}ms | 
                        缓动: ${anim.easing}
                    </div>
                </div>
                <div class="timeline-item-actions">
                    <button onclick="app.removeFromTimeline(${index})">删除</button>
                </div>
            </div>
        `
        )
        .join("");
    }
  }

  clearTimeline() {
    this.animations = [];
    this.updateTimelineDisplay();
    console.log("时间轴已清空");
  }

  playTimeline() {
    if (this.animations.length === 0) {
      console.log("时间轴为空，无法播放");
      return;
    }

    console.log("播放时间轴动画");

    // 依次播放所有动画
    this.animations.forEach((anim, index) => {
      setTimeout(() => {
        animate(anim.element, {
          left: anim.targetX + "px",
          top: anim.targetY + "px",
          duration: anim.duration,
          easing: anim.easing,
        });
      }, index * 500); // 每个动画间隔500ms开始
    });
  }

  removeFromTimeline(index) {
    this.animations.splice(index, 1);
    this.updateTimelineDisplay();
    console.log(`已从时间轴移除动画 ${index + 1}`);
  }

  updatePropertyInputs(x, y) {
    const posXInput = document.getElementById("posX");
    const posYInput = document.getElementById("posY");

    if (posXInput) posXInput.value = Math.round(x);
    if (posYInput) posYInput.value = Math.round(y);
  }

  startRecordingPath() {
    if (!this.selectedElement) {
      console.log("请先选择一个元素");
      return;
    }

    this.isRecordingPath = true;
    this.currentPath = [];
    this.clearPathPreview();

    console.log("开始记录路径，请在画布上点击来设置路径点");

    // 改变画布光标
    this.canvas.style.cursor = "crosshair";

    // 临时添加路径点击监听器 - 使用捕获阶段确保能接收到事件
    this.pathClickHandler = this.recordPathPoint.bind(this);
    this.canvas.addEventListener("click", this.pathClickHandler, true);
  }

  recordPathPoint(e) {
    if (!this.isRecordingPath) return;

    // 阻止事件冒泡，防止触发画布的点击事件导致元素失去选中状态
    e.stopPropagation();

    const canvasRect = this.canvas.getBoundingClientRect();
    const x = e.clientX - canvasRect.left;
    const y = e.clientY - canvasRect.top;

    this.currentPath.push({ x: Math.round(x), y: Math.round(y) });

    console.log(`记录路径点: (${Math.round(x)}, ${Math.round(y)})`);

    // 更新路径点数显示
    const pointCountSpan = document.getElementById("pathPointCount");
    if (pointCountSpan) {
      pointCountSpan.textContent = this.currentPath.length;
    }

    // 显示路径预览
    this.showPathPreview();
  }

  stopRecordingPath() {
    this.isRecordingPath = false;
    this.canvas.style.cursor = "default";

    // 移除临时监听器
    this.canvas.removeEventListener("click", this.pathClickHandler, true);

    console.log(`路径记录完成，共 ${this.currentPath.length} 个点`);
  }

  clearPath() {
    this.currentPath = [];
    this.clearPathPreview();

    const pointCountSpan = document.getElementById("pathPointCount");
    if (pointCountSpan) {
      pointCountSpan.textContent = "0";
    }

    console.log("路径已清除");
  }

  showPathPreview() {
    this.clearPathPreview();

    if (this.currentPath.length < 2) return;

    // 创建SVG路径预览
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.style.zIndex = "1";

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    let pathData = `M ${this.currentPath[0].x} ${this.currentPath[0].y}`;
    for (let i = 1; i < this.currentPath.length; i++) {
      pathData += ` L ${this.currentPath[i].x} ${this.currentPath[i].y}`;
    }

    path.setAttribute("d", pathData);
    path.setAttribute("stroke", "#e74c3c");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-dasharray", "5,5");

    svg.appendChild(path);

    // 添加路径点
    this.currentPath.forEach((point, index) => {
      const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
      );
      circle.setAttribute("cx", point.x);
      circle.setAttribute("cy", point.y);
      circle.setAttribute("r", "4");
      circle.setAttribute("fill", index === 0 ? "#27ae60" : "#e74c3c");
      svg.appendChild(circle);
    });

    this.canvas.appendChild(svg);
    this.pathPreview = svg;
  }

  clearPathPreview() {
    if (this.pathPreview) {
      this.pathPreview.remove();
      this.pathPreview = null;
    }
  }

  playPath() {
    if (!this.selectedElement || this.currentPath.length < 2) {
      console.log("需要选择元素且路径至少包含2个点");
      return;
    }

    const duration = document.getElementById("duration")?.value || 2000;
    const easing = document.getElementById("easing")?.value || "easeInOutQuad";

    // 获取元素的尺寸，用于计算偏移
    const elementRect = this.selectedElement.getBoundingClientRect();
    const elementWidth = elementRect.width;
    const elementHeight = elementRect.height;

    // 创建关键帧动画，调整坐标让元素中心对准路径点
    const keyframes = this.currentPath.map((point) => ({
      left: point.x - elementWidth / 2 + "px",
      top: point.y - elementHeight / 2 + "px",
    }));

    animate(this.selectedElement, {
      keyframes: keyframes,
      duration: parseInt(duration),
      easing: easing,
    });

    console.log("播放路径动画");
  }
}

// =============== 面板和分类收起展开功能 ===============

// 切换面板收起/展开状态
window.togglePanel = function (panelClass) {
  const panel = document.querySelector(`.${panelClass}`);
  const button = panel.querySelector(".collapse-btn");

  panel.classList.toggle("collapsed");

  // 更新按钮文本
  if (panel.classList.contains("collapsed")) {
    button.textContent = "+";
  } else {
    button.textContent = "−";
  }

  console.log(
    `面板 ${panelClass} ${
      panel.classList.contains("collapsed") ? "收起" : "展开"
    }`
  );
};

// 切换分类收起/展开状态
window.toggleCategory = function (categoryHeader) {
  const category = categoryHeader.parentElement;
  const toggle = categoryHeader.querySelector(".category-toggle");

  category.classList.toggle("collapsed");

  // 更新箭头方向
  if (category.classList.contains("collapsed")) {
    toggle.textContent = "+";
  } else {
    toggle.textContent = "−";
  }

  console.log(
    `分类 ${categoryHeader.querySelector("h4").textContent} ${
      category.classList.contains("collapsed") ? "收起" : "展开"
    }`
  );
};

// 切换设置区域收起/展开状态
window.toggleSection = function (sectionHeader) {
  const section = sectionHeader.parentElement;
  const toggle = sectionHeader.querySelector(".section-toggle");

  section.classList.toggle("collapsed");

  // 更新箭头方向
  if (section.classList.contains("collapsed")) {
    toggle.textContent = "+";
  } else {
    toggle.textContent = "−";
  }

  console.log(
    `设置区域 ${sectionHeader.querySelector("h4").textContent} ${
      section.classList.contains("collapsed") ? "收起" : "展开"
    }`
  );
};

// 当页面加载完成后初始化应用
document.addEventListener("DOMContentLoaded", () => {
  initCanvasResize();
  window.app = new BioAnimationTool();
});
