// 아래 두 값은 Supabase 프로젝트의 URL과 anon 키로 직접 바꿔 넣으세요.
const SUPABASE_URL = "https://nanvcxslcblqjsogwljf.supabase.co";
const SUPABASE_KEY = "sb_publishable_cycojk4GulhTWIgsd-CgLw_7lBzb7d6";

// CDN에서 불러온 Supabase 라이브러리로 데이터베이스 연결 객체를 만듭니다.
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 주문서와 화면에 있는 주요 요소를 가져옵니다.
const orderForm = document.getElementById("order-form");
const drinkSelect = document.getElementById("drink");
const quantityInput = document.getElementById("quantity");
const estimatedPrice = document.getElementById("estimated-price");
const orderConfirmation = document.getElementById("order-confirmation");
const nameInput = document.getElementById("name");
const phoneInput = document.getElementById("phone");
const requestInput = document.getElementById("request");
const submitButton = orderForm.querySelector('button[type="submit"]');
const orderTab = document.getElementById("order-tab");
const historyTab = document.getElementById("history-tab");
const orderPanel = document.getElementById("order-panel");
const historyPanel = document.getElementById("history-panel");
const orderCount = document.getElementById("order-count");
const ordersList = document.getElementById("orders-list");
const ordersSummary = document.getElementById("orders-summary");
const ordersTotal = document.getElementById("orders-total");
const clearOrdersButton = document.getElementById("clear-orders");

// 접수된 주문을 보관합니다. 페이지를 새로고침하면 목록은 초기화됩니다.
const orders = [];
let nextOrderNumber = 1;

// 현재 선택한 음료, 사이즈, 옵션, 수량을 바탕으로 주문 금액을 계산합니다.
// 음료를 고르지 않았다면 금액은 0원입니다.
function calculateTotal() {
  const selectedDrink = drinkSelect.options[drinkSelect.selectedIndex];

  if (!selectedDrink || !drinkSelect.value) {
    return 0;
  }

  // 선택 항목의 data-price 값을 숫자로 변환합니다.
  const drinkPrice = Number(selectedDrink.dataset.price) || 0;

  // 선택한 사이즈의 data-price를 가져옵니다.
  const selectedSize = orderForm.querySelector('input[name="size"]:checked');
  const sizePrice = selectedSize ? Number(selectedSize.dataset.price) || 0 : 0;

  // 체크된 추가 옵션의 가격을 모두 더합니다.
  let optionsPrice = 0;
  const selectedOptions = orderForm.querySelectorAll(
    'input[name="options"]:checked'
  );

  selectedOptions.forEach((option) => {
    optionsPrice += Number(option.dataset.price) || 0;
  });

  // 수량이 비어 있거나 범위를 벗어난 경우에도 금액이 잘못 계산되지 않도록 조정합니다.
  let quantity = Number(quantityInput.value);
  if (!Number.isFinite(quantity) || quantity < 1) {
    quantity = 1;
  } else if (quantity > 10) {
    quantity = 10;
  }

  // 한 잔의 금액에 수량을 곱해 전체 금액을 반환합니다.
  return (drinkPrice + sizePrice + optionsPrice) * quantity;
}

// 계산된 금액을 화면에 천 단위 콤마와 함께 표시합니다.
function updateEstimatedPrice() {
  const total = calculateTotal();
  estimatedPrice.textContent = `예상 금액: ${total.toLocaleString()}원`;
}

// 주문 내역 탭의 카드와 건수, 전체 금액을 다시 그립니다.
function renderOrders() {
  // 기존 카드를 비우고 현재 orders 배열에 맞춰 새로 만듭니다.
  ordersList.replaceChildren();
  orderCount.textContent = String(orders.length);

  if (orders.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty-orders";
    emptyMessage.textContent = "아직 주문 내역이 없어요 ☕";
    ordersList.appendChild(emptyMessage);
    ordersSummary.classList.add("hidden");
    return;
  }

  let totalAmount = 0;

  orders.forEach((order) => {
    totalAmount += order.amount;

    // 주문 한 건을 담을 카드와 카드의 첫 번째 줄을 만듭니다.
    const card = document.createElement("article");
    card.className = "order-card";

    const firstLine = document.createElement("div");
    firstLine.className = "order-card-heading";

    const customerAndAmount = document.createElement("p");
    customerAndAmount.className = "order-customer";
    customerAndAmount.textContent =
      `#${order.orderNumber} ${order.name}님 · ${order.amount.toLocaleString()}원`;

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "cancel-order";
    cancelButton.dataset.orderNumber = String(order.orderNumber);
    cancelButton.textContent = "취소";
    cancelButton.setAttribute("aria-label", `${order.name}님의 주문 취소`);

    firstLine.append(customerAndAmount, cancelButton);

    // 음료, 사이즈, 옵션, 수량을 두 번째 줄에 표시합니다.
    const details = document.createElement("p");
    details.className = "order-details";
    const optionsText = order.options.length > 0
      ? ` (${order.options.join(", ")})`
      : "";
    details.textContent =
      `${order.drink} ${order.size}사이즈${optionsText} ${order.quantity}잔`;

    // 요청사항이 있을 때만 요청사항을 시간과 함께 세 번째 줄에 표시합니다.
    const footer = document.createElement("p");
    footer.className = "order-card-footer";
    if (order.request) {
      const request = document.createElement("span");
      request.className = "order-request";
      request.textContent = `요청사항: ${order.request}`;
      footer.appendChild(request);

      footer.appendChild(document.createTextNode(" · "));
    }

    const time = document.createElement("time");
    time.dateTime = order.orderedAt.toISOString();
    time.textContent = order.orderedAt.toLocaleString("ko-KR");
    footer.appendChild(time);

    card.append(firstLine, details, footer);
    ordersList.appendChild(card);
  });

  // 주문 전체 금액과 건수를 보여주고, 전체 삭제 버튼을 표시합니다.
  ordersTotal.textContent =
    `총 주문 금액: ${totalAmount.toLocaleString()}원 (${orders.length}건)`;
  ordersSummary.classList.remove("hidden");
}

// 탭 버튼을 누르면 해당 화면만 보이도록 hidden 클래스를 바꿉니다.
function showTab(selectedTab) {
  const showOrderPanel = selectedTab === "order";
  orderPanel.classList.toggle("hidden", !showOrderPanel);
  historyPanel.classList.toggle("hidden", showOrderPanel);

  orderTab.classList.toggle("active", showOrderPanel);
  historyTab.classList.toggle("active", !showOrderPanel);
  orderTab.setAttribute("aria-selected", String(showOrderPanel));
  historyTab.setAttribute("aria-selected", String(!showOrderPanel));
}

orderTab.addEventListener("click", () => showTab("order"));
historyTab.addEventListener("click", () => showTab("history"));

// 금액에 영향을 주는 입력이 바뀔 때마다 예상 금액을 다시 계산합니다.
const priceInputs = orderForm.querySelectorAll(
  "#drink, #quantity, input[name='size'], input[name='options']"
);

priceInputs.forEach((input) => {
  input.addEventListener("input", updateEstimatedPrice);
  input.addEventListener("change", updateEstimatedPrice);
});

// 주문하기 버튼을 누르면 필수 항목을 확인하고 Supabase에 저장합니다.
orderForm.addEventListener("submit", async (event) => {
  // 브라우저가 페이지를 새로고침하는 기본 제출 동작을 막습니다.
  event.preventDefault();

  if (!nameInput.value.trim()) {
    alert("이름을 입력해주세요");
    nameInput.focus();
    return;
  }

  if (!drinkSelect.value) {
    alert("음료를 선택해주세요");
    drinkSelect.focus();
    return;
  }

  const selectedDrink = drinkSelect.options[drinkSelect.selectedIndex];
  const selectedSize = orderForm.querySelector('input[name="size"]:checked');
  const sizeName = selectedSize ? selectedSize.value : "M";
  const selectedOptions = orderForm.querySelectorAll(
    'input[name="options"]:checked'
  );
  const optionNames = Array.from(selectedOptions, (option) => option.value);

  let quantity = Number(quantityInput.value);
  if (!Number.isFinite(quantity) || quantity < 1) {
    quantity = 1;
  } else if (quantity > 10) {
    quantity = 10;
  }

  // Supabase에 저장할 데이터와 화면에 보여줄 주문 정보를 준비합니다.
  const order = {
    orderNumber: nextOrderNumber,
    name: nameInput.value.trim(),
    drink: selectedDrink.value,
    size: sizeName,
    options: optionNames,
    quantity,
    request: requestInput.value.trim(),
    amount: calculateTotal(),
    orderedAt: new Date()
  };

  // 요청 중 버튼을 잠가 연속 클릭으로 주문이 중복 저장되지 않게 합니다.
  submitButton.disabled = true;

  try {
    // 음료 가격은 음료 선택 항목의 data-price에서 따로 가져옵니다.
    const drinkPrice = Number(selectedDrink.dataset.price) || 0;
    const { error } = await supabaseClient
      .from("cafe_menu03")
      .insert({
        customer_name: order.name,
        phone: phoneInput.value.trim(),
        drink: order.drink,
        drink_price: drinkPrice,
        size: order.size,
        options: order.options,
        quantity: order.quantity,
        request: order.request,
        total_price: order.amount
      });

    // Supabase 응답에 오류가 있으면 실패 처리로 이동합니다.
    if (error) {
      throw error;
    }

    // 저장 성공 후에만 화면의 주문 내역과 확인 메시지를 갱신합니다.
    orders.unshift(order);
    nextOrderNumber += 1;

    const optionsText = order.options.length > 0
      ? ` (${order.options.join(", ")})`
      : "";
    orderConfirmation.textContent =
      `${order.name}님, ${order.drink} ${order.size}사이즈` +
      `${optionsText} ${order.quantity}잔, 총 ${order.amount.toLocaleString()}원 주문이 접수되었습니다!`;
    orderConfirmation.classList.remove("hidden");

    renderOrders();
  } catch (error) {
    // 저장에 실패하면 사용자에게 알리고 자세한 원인은 개발자 콘솔에 기록합니다.
    console.error("Supabase 주문 저장 오류:", error);
    alert("주문 저장에 실패했어요");
  } finally {
    // 저장 성공 또는 실패와 관계없이 주문하기 버튼을 다시 사용할 수 있게 합니다.
    submitButton.disabled = false;
  }
});

// 주문 내역 카드의 취소 버튼을 누르면 확인 후 해당 주문을 제거합니다.
ordersList.addEventListener("click", (event) => {
  const cancelButton = event.target.closest(".cancel-order");
  if (!cancelButton) {
    return;
  }

  const orderNumber = Number(cancelButton.dataset.orderNumber);
  const order = orders.find((item) => item.orderNumber === orderNumber);
  if (!order) {
    return;
  }

  if (confirm(`#${order.orderNumber} ${order.name}님의 주문을 취소할까요?`)) {
    const orderIndex = orders.findIndex((item) => item.orderNumber === orderNumber);
    orders.splice(orderIndex, 1);
    renderOrders();
  }
});

// 전체 삭제 버튼은 한 번 더 확인한 뒤 모든 주문 내역을 지웁니다.
clearOrdersButton.addEventListener("click", () => {
  if (confirm("모든 주문 내역을 지울까요?")) {
    orders.length = 0;
    renderOrders();
  }
});

// 다시 작성 버튼은 주문서만 초기화하고 주문 내역 배열은 그대로 둡니다.
orderForm.addEventListener("reset", () => {
  // reset 이벤트가 끝난 뒤 기본값(M 사이즈, 수량 1)을 기준으로 화면을 갱신합니다.
  window.setTimeout(() => {
    updateEstimatedPrice();
    orderConfirmation.textContent = "";
    orderConfirmation.classList.add("hidden");
  }, 0);
});

// 페이지를 처음 열었을 때 금액과 빈 주문 내역 안내를 표시합니다.
updateEstimatedPrice();
renderOrders();
