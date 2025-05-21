document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements (基本不变，但消息处理会变)
    const dealButton = document.getElementById('deal-button');
    const submitButton = document.getElementById('submit-button');
    const resetButton = document.getElementById('reset-button');
    const sortButton = document.getElementById('sort-button');

    const myHandArea = document.getElementById('my-hand-area');
    const frontHandPileWrapper = document.getElementById('front-hand-pile').querySelector('.cards-wrapper');
    const middleHandPileWrapper = document.getElementById('middle-hand-pile').querySelector('.cards-wrapper');
    const backHandPileWrapper = document.getElementById('back-hand-pile').querySelector('.cards-wrapper');
    const pileDropzones = [
        document.getElementById('front-hand-pile'),
        document.getElementById('middle-hand-pile'),
        document.getElementById('back-hand-pile')
    ];

    const gameMessageTextElement = document.getElementById('game-message'); // 这是浮层内的p元素
    const gameMessageOverlayElement = document.getElementById('game-message-overlay'); // 这是整个浮层

    const myPlayerNameElement = document.getElementById('my-player-name');
    const myPlayerScoreElement = document.getElementById('my-player-score');
    const myPlayerStatusElement = document.getElementById('my-player-status');

    // API URL
    const API_URL = 'https://9526.ip-ddns.com/thirteen_api/api.php'; // ！！！请替换

    // Card visuals & values (不变)
    const suits = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };
    const ranks = { 'A': 'A', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K' };
    const rankValues = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14};

    // Game State (不变)
    let originalHand = [];
    let currentMyHandCards = [];
    let frontHandData = [];
    let middleHandData = [];
    let backHandData = [];
    let draggedCard = null;

    // --- Init ---
    setupEventListeners();
    resetGameUI(); // Call this to set initial pile labels correctly
    showGameMessage('点击“发牌/新局”开始。');
    myPlayerNameElement.textContent = "玩家_" + Math.random().toString(36).substring(2, 6);
    myPlayerStatusElement.textContent = "准备中";
    myPlayerStatusElement.className = 'player-status waiting'; // 使用class控制颜色


    // --- Event Listeners Setup (不变，除了确保获取正确的wrapper) ---
    function setupEventListeners() {
        dealButton.addEventListener('click', handleDealNewHand);
        submitButton.addEventListener('click', handleSubmitHand);
        resetButton.addEventListener('click', handleResetArrangement);
        sortButton.addEventListener('click', handleSortHand);

        pileDropzones.forEach(zone => {
            zone.addEventListener('dragover', handleDragOver);
            zone.addEventListener('dragenter', handleDragEnter);
            zone.addEventListener('dragleave', handleDragLeave);
            zone.addEventListener('drop', handleDrop);
        });

        myHandArea.addEventListener('dragover', handleDragOver);
        myHandArea.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedCard && draggedCard.sourcePile !== 'myHandArea') {
                removeCardFromPile(draggedCard.value, draggedCard.sourcePile);
                addCardToMyHand(draggedCard.value, true);
                draggedCard = null;
                updatePileCountsAndLabels(); // 更新标签
                checkIfReadyToSubmit();
            } else if (draggedCard) {
                myHandArea.appendChild(draggedCard.element);
                draggedCard = null;
            }
        });
    }

    // --- UI Update Functions ---
    function showGameMessage(message, type = 'info') { // type can be 'info', 'success', 'error'
        gameMessageTextElement.textContent = message;
        gameMessageOverlayElement.classList.remove('error', 'success'); // Remove old type classes

        if (type === 'error') {
            gameMessageOverlayElement.classList.add('error');
        } else if (type === 'success') {
            gameMessageOverlayElement.classList.add('success'); // You might want to add a .success style in CSS
        }
        // 'info' uses default style

        gameMessageOverlayElement.classList.add('visible');

        setTimeout(() => {
            gameMessageOverlayElement.classList.remove('visible');
        }, message.length > 40 ? 5000 : 3500);
    }

    function resetGameUI() {
        originalHand = [];
        currentMyHandCards = [];
        frontHandData = [];
        middleHandData = [];
        backHandData = [];

        myHandArea.innerHTML = '';
        frontHandPileWrapper.innerHTML = ''; // Use wrapper
        middleHandPileWrapper.innerHTML = '';// Use wrapper
        backHandPileWrapper.innerHTML = ''; // Use wrapper

        dealButton.textContent = '发牌/新局';
        dealButton.disabled = false;
        submitButton.style.display = 'none';
        resetButton.style.display = 'none';
        sortButton.style.display = 'none';

        myPlayerStatusElement.textContent = "等待开始";
        myPlayerStatusElement.className = 'player-status waiting';
        updatePileCountsAndLabels(); // Crucial to reset labels
    }

    function updatePileCountsAndLabels() { // Renamed for clarity
        pileDropzones.forEach(zone => {
            const pileName = zone.id.split('-')[0]; // front, middle, back
            let currentPileData;
            let pileDisplayName;

            if (pileName === 'front') {
                currentPileData = frontHandData;
                pileDisplayName = "头";
            } else if (pileName === 'middle') {
                currentPileData = middleHandData;
                pileDisplayName = "中";
            } else { // back
                currentPileData = backHandData;
                pileDisplayName = "尾";
            }

            const maxCards = parseInt(zone.dataset.maxCards);
            zone.querySelector('.pile-label').textContent = `${pileDisplayName}墩 (${currentPileData.length}/${maxCards})`;
        });
    }


    // --- Card Creation and Rendering (基本不变) ---
    function createCardElement(cardStr) {
        const [suitKey, rankKey] = cardStr.split(' ');
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        cardDiv.classList.add(getSuitClass(suitKey));
        cardDiv.dataset.value = cardStr;
        cardDiv.draggable = true;

        const rankSpan = document.createElement('span');
        rankSpan.classList.add('rank');
        rankSpan.textContent = ranks[rankKey] || rankKey;

        const suitSpan = document.createElement('span');
        suitSpan.classList.add('suit');
        suitSpan.textContent = suits[suitKey] || suitKey;

        cardDiv.appendChild(rankSpan);
        cardDiv.appendChild(suitSpan);

        cardDiv.addEventListener('dragstart', handleDragStart);
        cardDiv.addEventListener('dragend', handleDragEnd);
        return cardDiv;
    }
    // renderMyHandCards, addCardToMyHand, removeCardFromMyHand (基本不变)
    function renderMyHandCards() {
        myHandArea.innerHTML = '';
        currentMyHandCards.forEach(cardObj => {
            myHandArea.appendChild(cardObj.element);
        });
    }
    function addCardToMyHand(cardValue, doRender = true) {
        const cardElement = createCardElement(cardValue);
        currentMyHandCards.push({ value: cardValue, element: cardElement });
        if (doRender) renderMyHandCards();
    }
    function removeCardFromMyHand(cardValue) {
        currentMyHandCards = currentMyHandCards.filter(c => c.value !== cardValue);
    }


    // --- Game Action Handlers ---
    async function handleDealNewHand() {
        showGameMessage('正在发牌...', 'info');
        resetGameUI(); // Resets counts and status
        dealButton.disabled = true;
        myPlayerStatusElement.textContent = "发牌中";
        myPlayerStatusElement.className = 'player-status'; // Default green

        try {
            // ... (fetch logic as before) ...
            const response = await fetch(`${API_URL}?action=deal`);
            if (!response.ok) throw new Error(`发牌服务请求失败: ${response.status}`);
            const data = await response.json();

            if (data.success && data.hand) {
                originalHand = [...data.hand];
                originalHand.forEach(cardStr => addCardToMyHand(cardStr, false));
                renderMyHandCards();

                showGameMessage('请拖拽手牌理牌。', 'info');
                myPlayerStatusElement.textContent = "理牌中";
                myPlayerStatusElement.className = 'player-status';
                dealButton.textContent = '新局';
                resetButton.style.display = 'inline-block';
                sortButton.style.display = 'inline-block';
                // AI buttons can also be shown here if desired
                document.getElementById('ai-suggest-button').style.display = 'inline-block';
                document.getElementById('ai-托管-button').style.display = 'inline-block';
            } else {
                throw new Error(data.message || '后端发牌逻辑错误');
            }
        } catch (error) {
            console.error('发牌请求失败:', error);
            showGameMessage(`发牌失败: ${error.message}`, 'error');
            myPlayerStatusElement.textContent = "发牌失败";
            myPlayerStatusElement.className = 'player-status error';
        } finally {
            dealButton.disabled = false;
        }
    }

    function handleSortHand() {
        // ... (sort logic as before) ...
        currentMyHandCards.sort((a, b) => {
            const rankA = rankValues[a.value.split(' ')[1]];
            const rankB = rankValues[b.value.split(' ')[1]];
            if (rankA !== rankB) return rankB - rankA;
            const suitA = a.value.split(' ')[0];
            const suitB = b.value.split(' ')[0];
            return suitA.localeCompare(suitB);
        });
        renderMyHandCards();
        showGameMessage('手牌已整理。', 'info');
    }

    function handleResetArrangement() {
        // ... (reset logic as before, ensure wrappers are used) ...
        [...frontHandData, ...middleHandData, ...backHandData].forEach(cardObj => {
            addCardToMyHand(cardObj.value, false);
        });
        renderMyHandCards();

        frontHandData = [];
        middleHandData = [];
        backHandData = [];

        frontHandPileWrapper.innerHTML = '';
        middleHandPileWrapper.innerHTML = '';
        backHandPileWrapper.innerHTML = '';

        showGameMessage('牌墩已清空，请重新理牌。', 'info');
        submitButton.style.display = 'none';
        updatePileCountsAndLabels();
    }

    async function handleSubmitHand() {
        // ... (submit logic as before, use new message types) ...
        const getPileValues = (pileData) => pileData.map(c => c.value);

        if (frontHandData.length !== 3 || middleHandData.length !== 5 || backHandData.length !== 5) {
            showGameMessage('牌墩张数不正确！头3中5尾5。', 'error');
            return;
        }
        // ... rest of submit logic
        const payload = { /* ... */ };
        showGameMessage('正在提交牌型...', 'info');
        // ... try-catch fetch ...
        // On success: showGameMessage(`提交成功！结果：${result.message || '等待后端详细结果'}`, 'success');
        // On backend reject: showGameMessage(`提交被拒：${result.message}`, 'error');
        // On fetch error: showGameMessage(`提交出错：${error.message}`, 'error');

        // Player status updates
        myPlayerStatusElement.textContent = "比牌中...";
        myPlayerStatusElement.className = 'player-status';
        // After result:
        // myPlayerStatusElement.textContent = "本局结束";
        // myPlayerStatusElement.className = 'player-status waiting'; // Or similar for end of round

        // Example of a more complete submit handler:
        const frontValues = getPileValues(frontHandData);
        const middleValues = getPileValues(middleHandData);
        const backValues = getPileValues(backHandData);

        if (frontValues.length !== 3 || middleValues.length !== 5 || backValues.length !== 5) {
            showGameMessage('牌墩张数不正确！请确保头3中5尾5。', 'error');
            return;
        }

        const finalPayload = {
            front: frontValues,
            middle: middleValues,
            back: backValues
        };

        showGameMessage('正在提交牌型...', 'info');
        submitButton.disabled = true;
        resetButton.disabled = true;
        sortButton.disabled = true;
        myPlayerStatusElement.textContent = "比牌中...";
        myPlayerStatusElement.className = 'player-status';


        try {
            const response = await fetch(`${API_URL}?action=submitHand`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalPayload),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || `提交失败: HTTP ${response.status}`);
            }

            if (result.success) {
                showGameMessage(`提交成功！${result.message || '等待结果...'}`, 'success');
                submitButton.style.display = 'none'; // Hide after successful submission
                myPlayerStatusElement.textContent = "本局结束";
                myPlayerStatusElement.className = 'player-status waiting'; // Ready for new game

            } else {
                showGameMessage(`提交被拒：${result.message}`, 'error');
                myPlayerStatusElement.textContent = "理牌错误";
                myPlayerStatusElement.className = 'player-status error';
            }

        } catch (error) {
            console.error('提交牌型失败:', error);
            showGameMessage(`提交出错：${error.message}`, 'error');
            myPlayerStatusElement.textContent = "提交异常";
            myPlayerStatusElement.className = 'player-status error';
        } finally {
            if (myPlayerStatusElement.textContent !== "本局结束") {
                 submitButton.disabled = false;
                 resetButton.disabled = false;
                 sortButton.disabled = false;
            }
        }
    }


    function checkIfReadyToSubmit() {
        // ... (logic as before) ...
        const totalArranged = frontHandData.length + middleHandData.length + backHandData.length;
        if (totalArranged === 13 && currentMyHandCards.length === 0) {
            submitButton.style.display = 'inline-block';
            submitButton.disabled = false;
        } else {
            submitButton.style.display = 'none';
        }
    }


    // --- Drag and Drop Handlers (ensure wrappers are used for drop targets) ---
    function handleDrop(e) {
        e.preventDefault();
        const dropzoneElement = e.target.closest('.hand-pile-dropzone');
        if (!dropzoneElement || !draggedCard) return;

        dropzoneElement.classList.remove('drag-over');
        const targetPileName = dropzoneElement.dataset.pileName;
        const targetPileWrapper = dropzoneElement.querySelector('.cards-wrapper'); // Important: drop into wrapper
        const maxCards = parseInt(dropzoneElement.dataset.maxCards);

        let targetPileData;
        if (targetPileName === 'front') targetPileData = frontHandData;
        else if (targetPileName === 'middle') targetPileData = middleHandData;
        else targetPileData = backHandData;

        if (targetPileData.length < maxCards) {
            if (draggedCard.sourcePile === 'myHandArea') {
                removeCardFromMyHand(draggedCard.value);
            } else if (draggedCard.sourcePile) {
                removeCardFromPile(draggedCard.value, draggedCard.sourcePile);
            }

            targetPileData.push({value: draggedCard.value, element: draggedCard.element});
            targetPileWrapper.appendChild(draggedCard.element); // Append to wrapper

            updatePileCountsAndLabels(); // Update labels
            checkIfReadyToSubmit();

        } else {
            showGameMessage(`${targetPileName.charAt(0).toUpperCase() + targetPileName.slice(1)}墩已满!`, 'error');
        }
        draggedCard = null;
    }
    // handleDragStart, handleDragEnd, handleDragOver, handleDragEnter, handleDragLeave, removeCardFromPile (基本不变)
    function handleDragStart(e) {
        draggedCard = {
            value: e.target.dataset.value,
            element: e.target,
            sourcePile: null
        };
        if (e.target.parentElement === myHandArea) {
            draggedCard.sourcePile = 'myHandArea';
        } else {
            pileDropzones.forEach(zone => {
                if (zone.querySelector('.cards-wrapper').contains(e.target)) {
                    draggedCard.sourcePile = zone.dataset.pileName;
                }
            });
        }
        e.dataTransfer.setData('text/plain', draggedCard.value);
        e.dataTransfer.effectAllowed = 'move';
        e.target.classList.add('dragging');
        setTimeout(() => e.target.style.opacity = '0.6', 0); // Reduced opacity for dragging
    }

    function handleDragEnd(e) {
        if (e.target) { // Check if target still exists
            e.target.classList.remove('dragging');
            e.target.style.opacity = '1';
        }
        draggedCard = null;
        pileDropzones.forEach(zone => zone.classList.remove('drag-over'));
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function handleDragEnter(e) {
        e.preventDefault();
        const dropzone = e.target.closest('.hand-pile-dropzone');
        if (dropzone) {
            dropzone.classList.add('drag-over');
        }
    }

    function handleDragLeave(e) {
        const dropzone = e.target.closest('.hand-pile-dropzone');
        if (dropzone) {
            if (!dropzone.contains(e.relatedTarget)) {
                dropzone.classList.remove('drag-over');
            }
        }
    }

    function removeCardFromPile(cardValue, pileName) {
        if (pileName === 'front') frontHandData = frontHandData.filter(c => c.value !== cardValue);
        else if (pileName === 'middle') middleHandData = middleHandData.filter(c => c.value !== cardValue);
        else if (pileName === 'back') backHandData = backHandData.filter(c => c.value !== cardValue);
    }


    // --- Utility (不变) ---
    function getSuitClass(suitKey) {
        // ... (as before) ...
        const suitLower = suitKey.toLowerCase();
        if (suitLower === 'h') return 'hearts';
        if (suitLower === 'd') return 'diamonds';
        if (suitLower === 's') return 'spades';
        if (suitLower === 'c') return 'clubs';
        return '';
    }
});
