document.addEventListener('DOMContentLoaded', () => {
    const dealButton = document.getElementById('deal-button');
    const submitButton = document.getElementById('submit-button');
    const resetArrangementButton = document.getElementById('reset-arrangement-button');

    const myCardsContainer = document.getElementById('my-cards');
    const frontHandContainer = document.getElementById('front-hand');
    const middleHandContainer = document.getElementById('middle-hand');
    const backHandContainer = document.getElementById('back-hand');

    const gameMessage = document.getElementById('game-message');

    // 后端 API 地址
    const API_URL = 'https://9526.ip-ddns.com/thirteen_api/api.php'; // ！！！请替换为你的实际API地址

    const suits = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };
    const ranks = { 'A': 'A', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K' };

    let originalHand = []; // 存储从后端获取的13张原始手牌 (字符串数组)
    let currentUnarrangedCards = []; // 当前未被分配到墩的牌 (字符串数组)

    let frontHandCards = []; // 头墩的牌 (字符串数组)
    let middleHandCards = [];// 中墩的牌 (字符串数组)
    let backHandCards = [];  // 尾墩的牌 (字符串数组)

    let selectedCardElement = null; // 当前被选中的卡牌DOM元素
    let selectedCardValue = null;   // 当前被选中的卡牌的值 (例如 "H A")

    // --- Event Listeners ---
    dealButton.addEventListener('click', dealNewHand);
    submitButton.addEventListener('click', handleSubmitHand);
    resetArrangementButton.addEventListener('click', resetArrangement);

    // 给牌墩容器添加点击事件监听器
    [frontHandContainer, middleHandContainer, backHandContainer].forEach(pile => {
        pile.addEventListener('click', () => handlePileClick(pile));
    });


    // --- Core Game Logic Functions ---
    async function dealNewHand() {
        gameMessage.textContent = '正在发牌...';
        resetGameState(); // 重置游戏状态
        dealButton.disabled = true;
        submitButton.style.display = 'none';
        resetArrangementButton.style.display = 'none';

        try {
            const response = await fetch(`${API_URL}?action=deal`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            if (data.success && data.hand) {
                originalHand = [...data.hand];
                currentUnarrangedCards = [...data.hand];
                renderUnarrangedCards();
                gameMessage.textContent = '请理牌：点击上方手牌，再点击下方目标牌墩。';
                resetArrangementButton.style.display = 'inline-block';
            } else {
                gameMessage.textContent = '发牌失败: ' + (data.message || '未知错误');
            }
        } catch (error) {
            console.error('发牌请求失败:', error);
            gameMessage.textContent = '发牌请求失败，请检查网络或后端API。';
        } finally {
            dealButton.disabled = false;
        }
    }

    function resetGameState() {
        originalHand = [];
        currentUnarrangedCards = [];
        frontHandCards = [];
        middleHandCards = [];
        backHandCards = [];
        selectedCardElement = null;
        selectedCardValue = null;

        myCardsContainer.innerHTML = '';
        frontHandContainer.innerHTML = '';
        middleHandContainer.innerHTML = '';
        backHandContainer.innerHTML = '';
        gameMessage.textContent = '点击“发牌”开始游戏。';
        submitButton.style.display = 'none';
        resetArrangementButton.style.display = 'none';
        if (document.querySelector('.card.selected')) {
            document.querySelector('.card.selected').classList.remove('selected');
        }
    }

    function resetArrangement() {
        // 将所有牌墩的牌移回未理牌区
        frontHandCards.forEach(card => currentUnarrangedCards.push(card));
        middleHandCards.forEach(card => currentUnarrangedCards.push(card));
        backHandCards.forEach(card => currentUnarrangedCards.push(card));

        frontHandCards = [];
        middleHandCards = [];
        backHandCards = [];

        selectedCardElement = null;
        selectedCardValue = null;

        renderUnarrangedCards();
        renderPileCards(frontHandContainer, frontHandCards);
        renderPileCards(middleHandContainer, middleHandCards);
        renderPileCards(backHandContainer, backHandCards);

        gameMessage.textContent = '已重置，请重新理牌。';
        submitButton.style.display = 'none';
        if (document.querySelector('.card.selected')) {
            document.querySelector('.card.selected').classList.remove('selected');
        }
    }


    function renderUnarrangedCards() {
        myCardsContainer.innerHTML = '';
        currentUnarrangedCards.forEach(cardStr => {
            const cardDiv = createCardElement(cardStr);
            cardDiv.addEventListener('click', () => handleCardClick(cardDiv, cardStr, 'unarranged'));
            myCardsContainer.appendChild(cardDiv);
        });
        checkIfReadyToSubmit();
    }

    function renderPileCards(pileContainer, cardsArray) {
        pileContainer.innerHTML = '';
        cardsArray.forEach(cardStr => {
            const cardDiv = createCardElement(cardStr);
            cardDiv.classList.add('in-pile'); // 标记为在牌墩中
            // 点击牌墩中的牌，将其移回未理牌区
            cardDiv.addEventListener('click', () => handleCardClick(cardDiv, cardStr, 'pile', pileContainer.dataset.pileName));
            pileContainer.appendChild(cardDiv);
        });
        checkIfReadyToSubmit();
    }

    function createCardElement(cardStr) {
        const [suitKey, rankKey] = cardStr.split(' ');
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        cardDiv.classList.add(getSuitClass(suitKey));
        cardDiv.dataset.value = cardStr; // 存储卡牌值

        const rankSpan = document.createElement('span');
        rankSpan.classList.add('rank');
        rankSpan.textContent = ranks[rankKey] || rankKey;

        const suitSpan = document.createElement('span');
        suitSpan.classList.add('suit');
        suitSpan.textContent = suits[suitKey] || suitKey;

        cardDiv.appendChild(rankSpan);
        cardDiv.appendChild(suitSpan);
        return cardDiv;
    }

    function handleCardClick(cardElement, cardValue, source, pileName = null) {
        if (source === 'unarranged') { // 点击的是未理的牌
            if (selectedCardElement === cardElement) { // 重复点击同一张牌，取消选择
                selectedCardElement.classList.remove('selected');
                selectedCardElement = null;
                selectedCardValue = null;
            } else {
                if (selectedCardElement) {
                    selectedCardElement.classList.remove('selected'); // 取消之前选中的
                }
                selectedCardElement = cardElement;
                selectedCardValue = cardValue;
                selectedCardElement.classList.add('selected');
                gameMessage.textContent = `已选择 ${formatCardString(cardValue)}，请点击目标牌墩。`;
            }
        } else if (source === 'pile') { // 点击的是牌墩中的牌 (将其移回)
            if (selectedCardElement) { // 如果有选中的未理牌，则不处理牌墩中牌的点击，避免混淆
                 gameMessage.textContent = `请先将选中的 ${formatCardString(selectedCardValue)} 放入牌墩，或取消选择。`;
                return;
            }
            // 从牌墩中移除
            if (pileName === 'front') frontHandCards = frontHandCards.filter(c => c !== cardValue);
            else if (pileName === 'middle') middleHandCards = middleHandCards.filter(c => c !== cardValue);
            else if (pileName === 'back') backHandCards = backHandCards.filter(c => c !== cardValue);

            currentUnarrangedCards.push(cardValue); // 添加回未理牌区

            // 重新渲染
            renderUnarrangedCards();
            renderPileCards(frontHandContainer, frontHandCards);
            renderPileCards(middleHandContainer, middleHandCards);
            renderPileCards(backHandContainer, backHandCards);
            gameMessage.textContent = `${formatCardString(cardValue)} 已移回手牌区。`;
        }
    }

    function handlePileClick(pileContainer) {
        if (!selectedCardElement || !selectedCardValue) {
            gameMessage.textContent = '请先从上方手牌区选择一张牌。';
            return;
        }

        const pileName = pileContainer.dataset.pileName;
        const maxCards = parseInt(pileContainer.dataset.maxCards);
        let targetPileArray;

        if (pileName === 'front') targetPileArray = frontHandCards;
        else if (pileName === 'middle') targetPileArray = middleHandCards;
        else if (pileName === 'back') targetPileArray = backHandCards;
        else return; // 未知牌墩

        if (targetPileArray.length < maxCards) {
            // 从 currentUnarrangedCards 中移除
            currentUnarrangedCards = currentUnarrangedCards.filter(card => card !== selectedCardValue);
            // 添加到目标牌墩数组
            targetPileArray.push(selectedCardValue);

            // 更新UI
            renderUnarrangedCards(); // 会移除被选中的牌
            renderPileCards(pileContainer, targetPileArray);

            gameMessage.textContent = `${formatCardString(selectedCardValue)} 已放入 ${pileContainer.previousElementSibling.textContent.split(' (')[0]}。`;

            // 清除选择
            selectedCardElement.classList.remove('selected'); // selected类由renderUnarrangedCards移除，但以防万一
            selectedCardElement = null;
            selectedCardValue = null;

        } else {
            gameMessage.textContent = `${pileContainer.previousElementSibling.textContent.split(' (')[0]} 已满 (${maxCards}张)。`;
        }
        checkIfReadyToSubmit();
    }

    function checkIfReadyToSubmit() {
        const totalArranged = frontHandCards.length + middleHandCards.length + backHandCards.length;
        if (totalArranged === 13 && currentUnarrangedCards.length === 0) {
            submitButton.style.display = 'inline-block';
            submitButton.disabled = false; // 确保按钮可用
             gameMessage.textContent = '所有牌已理好，可以提交牌型了！';
        } else {
            submitButton.style.display = 'none';
        }
    }

    async function handleSubmitHand() {
        if (frontHandCards.length !== 3 || middleHandCards.length !== 5 || backHandCards.length !== 5) {
            gameMessage.textContent = '牌墩张数不正确！头墩3张，中墩5张，尾墩5张。';
            return;
        }

        const payload = {
            front: frontHandCards,
            middle: middleHandCards,
            back: backHandCards
        };

        gameMessage.textContent = '正在提交牌型...';
        submitButton.disabled = true;
        resetArrangementButton.disabled = true; // 理牌期间和提交后禁止重置

        try {
            const response = await fetch(`${API_URL}?action=submitHand`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();

            if (result.success) {
                // 后续在这里处理后端返回的详细比牌结果和分数
                gameMessage.textContent = `提交成功！结果：${result.message}`;
                // 可以在这里展示后端分析的牌型，例如：
                // if (result.analysis) {
                //     displayAnalysis(result.analysis);
                // }
            } else {
                gameMessage.textContent = `提交失败：${result.message}`;
            }

        } catch (error) {
            console.error('提交牌型失败:', error);
            gameMessage.textContent = `提交错误：${error.message}`;
        } finally {
            // 通常提交后，发牌按钮会变为“再来一局”或直接可用
            // submitButton.disabled = false; // 如果允许重复提交同一手牌调试，则解开
            // resetArrangementButton.disabled = false;
            // dealButton.textContent = "再来一局"; // 可以考虑修改按钮文本
        }
    }

    // --- Utility Functions ---
    function getSuitClass(suitKey) {
        const suitLower = suitKey.toLowerCase();
        if (suitLower === 'h') return 'hearts';
        if (suitLower === 'd') return 'diamonds';
        if (suitLower === 's') return 'spades';
        if (suitLower === 'c') return 'clubs';
        return '';
    }

    function formatCardString(cardStr) {
        const [suitKey, rankKey] = cardStr.split(' ');
        return `${suits[suitKey] || suitKey}${ranks[rankKey] || rankKey}`;
    }

    // --- Initial Setup ---
    resetGameState(); // 初始化游戏状态
    gameMessage.textContent = '点击“发牌”开始新游戏。';

});
