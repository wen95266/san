document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dealButton = document.getElementById('deal-button');
    const submitButton = document.getElementById('submit-button');
    const resetButton = document.getElementById('reset-button'); // 重摆
    const sortButton = document.getElementById('sort-button');   // 整理手牌
    // AI按钮暂时不加事件监听，因为功能复杂
    // const aiSuggestButton = document.getElementById('ai-suggest-button');
    // const ai托管Button = document.getElementById('ai-托管-button');


    const myHandArea = document.getElementById('my-hand-area');
    const frontHandPile = document.getElementById('front-hand-pile').querySelector('.cards-wrapper');
    const middleHandPile = document.getElementById('middle-hand-pile').querySelector('.cards-wrapper');
    const backHandPile = document.getElementById('back-hand-pile').querySelector('.cards-wrapper');
    const pileDropzones = [
        document.getElementById('front-hand-pile'),
        document.getElementById('middle-hand-pile'),
        document.getElementById('back-hand-pile')
    ];


    const gameMessageElement = document.getElementById('game-message');
    const gameMessageOverlay = document.getElementById('game-message-overlay');

    const myPlayerNameElement = document.getElementById('my-player-name');
    const myPlayerScoreElement = document.getElementById('my-player-score');
    const myPlayerStatusElement = document.getElementById('my-player-status');

    // API URL
    const API_URL = 'https://9526.ip-ddns.com/thirteen_api/api.php'; // ！！！请替换

    // Card visuals
    const suits = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };
    const ranks = { 'A': 'A', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K' };
    // Card rank values for sorting
    const rankValues = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14};

    // Game State
    let originalHand = [];      // 13张原始手牌 (字符串数组 "S A")
    let currentMyHandCards = []; // 当前在手牌区的牌对象 {value: "S A", element: HTMLDivElement}

    let frontHandData = []; // {value: "S A", element: HTMLDivElement}
    let middleHandData = [];
    let backHandData = [];

    let draggedCard = null; // {value: "S A", element: HTMLDivElement, sourcePile: string | null }
                            // sourcePile: 'myHandArea', 'front', 'middle', 'back'

    // --- Init ---
    setupEventListeners();
    resetGameUI();
    showGameMessage('点击“发牌”开始游戏。');
    myPlayerNameElement.textContent = "玩家" + Math.random().toString(36).substring(2, 6); // 随机ID


    // --- Event Listeners Setup ---
    function setupEventListeners() {
        dealButton.addEventListener('click', handleDealNewHand);
        submitButton.addEventListener('click', handleSubmitHand);
        resetButton.addEventListener('click', handleResetArrangement);
        sortButton.addEventListener('click', handleSortHand);

        // Drag and Drop for Piles
        pileDropzones.forEach(zone => {
            zone.addEventListener('dragover', handleDragOver);
            zone.addEventListener('dragenter', handleDragEnter);
            zone.addEventListener('dragleave', handleDragLeave);
            zone.addEventListener('drop', handleDrop);
        });

        // Allow dragging cards from myHandArea back to itself (for reordering, though sort button is better)
        myHandArea.addEventListener('dragover', handleDragOver);
        myHandArea.addEventListener('drop', (e) => {
             e.preventDefault();
            if (draggedCard && draggedCard.sourcePile !== 'myHandArea') { // Only if dragged from a pile
                // Move card from pile back to hand
                removeCardFromPile(draggedCard.value, draggedCard.sourcePile);
                addCardToMyHand(draggedCard.value, true); // true to re-render
                draggedCard = null;
                updatePileCounts();
                checkIfReadyToSubmit();
            } else if (draggedCard) { // Reordering within hand - just append
                 myHandArea.appendChild(draggedCard.element);
                 draggedCard = null;
            }
        });
    }

    // --- UI Update Functions ---
    function showGameMessage(message, isError = false) {
        gameMessageElement.textContent = message;
        gameMessageOverlay.classList.add('visible');
        if (isError) gameMessageOverlay.style.backgroundColor = 'rgba(180,0,0,0.8)';
        else gameMessageOverlay.style.backgroundColor = 'rgba(0,0,0,0.8)';

        setTimeout(() => {
            gameMessageOverlay.classList.remove('visible');
        }, message.length > 30 ? 5000 : 3000); // Longer messages stay longer
    }

    function resetGameUI() {
        originalHand = [];
        currentMyHandCards = [];
        frontHandData = [];
        middleHandData = [];
        backHandData = [];

        myHandArea.innerHTML = '';
        frontHandPile.innerHTML = '';
        middleHandPile.innerHTML = '';
        backHandPile.innerHTML = '';

        dealButton.textContent = '发牌';
        dealButton.disabled = false;
        submitButton.style.display = 'none';
        resetButton.style.display = 'none';
        sortButton.style.display = 'none';

        myPlayerStatusElement.textContent = "等待发牌";
        updatePileCounts();
    }

    function updatePileCounts() {
        pileDropzones.forEach(zone => {
            const pileName = zone.id.split('-')[0]; // front, middle, back
            const currentPileData = pileName === 'front' ? frontHandData : (pileName === 'middle' ? middleHandData : backHandData);
            const maxCards = parseInt(zone.dataset.maxCards);
            zone.querySelector('.pile-label').textContent = `${zone.dataset.pileName.charAt(0).toUpperCase() + zone.dataset.pileName.slice(1)}墩 (${currentPileData.length}/${maxCards})`;
        });
    }


    // --- Card Creation and Rendering ---
    function createCardElement(cardStr) {
        const [suitKey, rankKey] = cardStr.split(' ');
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        cardDiv.classList.add(getSuitClass(suitKey));
        cardDiv.dataset.value = cardStr;
        cardDiv.draggable = true; // Make it draggable

        const rankSpan = document.createElement('span');
        rankSpan.classList.add('rank');
        rankSpan.textContent = ranks[rankKey] || rankKey;

        const suitSpan = document.createElement('span');
        suitSpan.classList.add('suit');
        suitSpan.textContent = suits[suitKey] || suitKey;

        cardDiv.appendChild(rankSpan);
        cardDiv.appendChild(suitSpan);

        // Drag events for cards
        cardDiv.addEventListener('dragstart', handleDragStart);
        cardDiv.addEventListener('dragend', handleDragEnd);
        return cardDiv;
    }

    function renderMyHandCards() {
        myHandArea.innerHTML = ''; // Clear before rendering
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
        // No need to re-render here, dragend or drop will handle element removal from DOM
    }


    // --- Game Action Handlers ---
    async function handleDealNewHand() {
        showGameMessage('正在发牌...');
        resetGameUI();
        dealButton.disabled = true;
        myPlayerStatusElement.textContent = "发牌中...";

        try {
            const response = await fetch(`${API_URL}?action=deal`);
            if (!response.ok) throw new Error(`发牌服务请求失败: ${response.status}`);
            const data = await response.json();

            if (data.success && data.hand) {
                originalHand = [...data.hand];
                originalHand.forEach(cardStr => addCardToMyHand(cardStr, false)); // Add but don't render one by one
                renderMyHandCards(); // Render all at once

                showGameMessage('请拖拽手牌到上方牌墩进行理牌。');
                myPlayerStatusElement.textContent = "理牌中";
                dealButton.textContent = '新局'; // Or hide deal button
                resetButton.style.display = 'inline-block';
                sortButton.style.display = 'inline-block';
            } else {
                throw new Error(data.message || '后端发牌逻辑错误');
            }
        } catch (error) {
            console.error('发牌请求失败:', error);
            showGameMessage(`发牌失败: ${error.message}`, true);
            myPlayerStatusElement.textContent = "发牌失败";
        } finally {
            dealButton.disabled = false; // Allow starting new game
        }
    }

    function handleSortHand() {
        currentMyHandCards.sort((a, b) => {
            const rankA = rankValues[a.value.split(' ')[1]];
            const rankB = rankValues[b.value.split(' ')[1]];
            if (rankA !== rankB) return rankB - rankA; // Sort by rank descending
            // Optional: Sort by suit if ranks are same
            const suitA = a.value.split(' ')[0];
            const suitB = b.value.split(' ')[0];
            return suitA.localeCompare(suitB);
        });
        renderMyHandCards();
        showGameMessage('手牌已整理。');
    }

    function handleResetArrangement() {
        // Move all cards from piles back to myHandArea
        [...frontHandData, ...middleHandData, ...backHandData].forEach(cardObj => {
            addCardToMyHand(cardObj.value, false); // Add to data, don't re-render myHand yet
        });
        renderMyHandCards(); // Now render myHand with all cards

        frontHandData = [];
        middleHandData = [];
        backHandData = [];

        frontHandPile.innerHTML = '';
        middleHandPile.innerHTML = '';
        backHandPile.innerHTML = '';

        showGameMessage('牌墩已清空，请重新理牌。');
        submitButton.style.display = 'none';
        updatePileCounts();
    }

    async function handleSubmitHand() {
        const getPileValues = (pileData) => pileData.map(c => c.value);

        if (frontHandData.length !== 3 || middleHandData.length !== 5 || backHandData.length !== 5) {
            showGameMessage('牌墩张数不正确！请确保头3中5尾5。', true);
            return;
        }

        const payload = {
            front: getPileValues(frontHandData),
            middle: getPileValues(middleHandData),
            back: getPileValues(backHandData)
        };

        showGameMessage('正在提交牌型...');
        submitButton.disabled = true;
        resetButton.disabled = true;
        sortButton.disabled = true;
        myPlayerStatusElement.textContent = "比牌中...";


        try {
            const response = await fetch(`${API_URL}?action=submitHand`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json(); // Try to parse JSON even if not ok
            if (!response.ok) {
                throw new Error(result.message || `提交失败: HTTP ${response.status}`);
            }

            if (result.success) {
                showGameMessage(`提交成功！结果：${result.message || '等待后端详细结果'}`);
                // Here you would display scores, opponent cards if any, etc.
                // For now, disable further actions until new game
                submitButton.style.display = 'none';
                myPlayerStatusElement.textContent = "本局结束";

            } else {
                showGameMessage(`提交被拒：${result.message}`, true);
                myPlayerStatusElement.textContent = "理牌错误";
            }

        } catch (error) {
            console.error('提交牌型失败:', error);
            showGameMessage(`提交出错：${error.message}`, true);
            myPlayerStatusElement.textContent = "提交异常";
        } finally {
             // Re-enable buttons if submission failed and user might want to correct
            if (myPlayerStatusElement.textContent !== "本局结束") {
                 submitButton.disabled = false;
                 resetButton.disabled = false;
                 sortButton.disabled = false;
            }
        }
    }

    function checkIfReadyToSubmit() {
        const totalArranged = frontHandData.length + middleHandData.length + backHandData.length;
        if (totalArranged === 13 && currentMyHandCards.length === 0) {
            submitButton.style.display = 'inline-block';
            submitButton.disabled = false;
        } else {
            submitButton.style.display = 'none';
        }
    }


    // --- Drag and Drop Handlers ---
    function handleDragStart(e) {
        // e.target is the card element
        draggedCard = {
            value: e.target.dataset.value,
            element: e.target,
            sourcePile: null // Will be determined or set if from a pile
        };

        // Check if card is from a pile or myHandArea
        if (e.target.parentElement === myHandArea) {
            draggedCard.sourcePile = 'myHandArea';
        } else {
            pileDropzones.forEach(zone => {
                if (zone.querySelector('.cards-wrapper').contains(e.target)) {
                    draggedCard.sourcePile = zone.dataset.pileName; // 'front', 'middle', 'back'
                }
            });
        }

        e.dataTransfer.setData('text/plain', draggedCard.value); // Necessary for FF
        e.dataTransfer.effectAllowed = 'move';
        e.target.classList.add('dragging');
        // setTimeout to allow DOM to update opacity before screenshot for drag image
        setTimeout(() => e.target.style.opacity = '0.5', 0);
    }

    function handleDragEnd(e) {
        e.target.classList.remove('dragging');
        e.target.style.opacity = '1'; // Reset opacity
        draggedCard = null; // Clear dragged card
        // Remove any lingering drag-over class from dropzones
        pileDropzones.forEach(zone => zone.classList.remove('drag-over'));
    }

    function handleDragOver(e) {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    }

    function handleDragEnter(e) {
        e.preventDefault();
        // e.target might be a card inside the dropzone, or the dropzone itself.
        // We want to highlight the main dropzone element.
        const dropzone = e.target.closest('.hand-pile-dropzone');
        if (dropzone) {
            dropzone.classList.add('drag-over');
        }
    }

    function handleDragLeave(e) {
        // e.target might be a card inside the dropzone, or the dropzone itself.
        const dropzone = e.target.closest('.hand-pile-dropzone');
        if (dropzone) {
            // Check if the relatedTarget (where the mouse is going) is still within the dropzone
            if (!dropzone.contains(e.relatedTarget)) {
                dropzone.classList.remove('drag-over');
            }
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        const dropzoneElement = e.target.closest('.hand-pile-dropzone');
        if (!dropzoneElement || !draggedCard) return;

        dropzoneElement.classList.remove('drag-over');
        const targetPileName = dropzoneElement.dataset.pileName;
        const targetPileWrapper = dropzoneElement.querySelector('.cards-wrapper');
        const maxCards = parseInt(dropzoneElement.dataset.maxCards);

        let targetPileData;
        if (targetPileName === 'front') targetPileData = frontHandData;
        else if (targetPileName === 'middle') targetPileData = middleHandData;
        else targetPileData = backHandData;

        if (targetPileData.length < maxCards) {
            // 1. Remove card from its source data structure
            if (draggedCard.sourcePile === 'myHandArea') {
                removeCardFromMyHand(draggedCard.value);
            } else if (draggedCard.sourcePile) { // Was in another pile
                removeCardFromPile(draggedCard.value, draggedCard.sourcePile);
            }

            // 2. Add card to target pile data structure
            targetPileData.push({value: draggedCard.value, element: draggedCard.element});

            // 3. Append card element to target pile wrapper in DOM
            targetPileWrapper.appendChild(draggedCard.element);

            // 4. Update counts and check submission readiness
            updatePileCounts();
            checkIfReadyToSubmit();

        } else {
            showGameMessage(`${targetPileName.toUpperCase()}墩已满!`, true);
            // If card was dragged from hand, it should remain there (no change to DOM needed beyond class removal)
            // If card was dragged from another pile, it should be returned to that pile (more complex)
            // For simplicity now, we assume if a pile is full, the card is "dropped" back where it was (handled by dragend)
        }
        draggedCard = null; // Clear after drop
    }

    function removeCardFromPile(cardValue, pileName) {
        if (pileName === 'front') frontHandData = frontHandData.filter(c => c.value !== cardValue);
        else if (pileName === 'middle') middleHandData = middleHandData.filter(c => c.value !== cardValue);
        else if (pileName === 'back') backHandData = backHandData.filter(c => c.value !== cardValue);
        // DOM element removal is handled by appending it elsewhere or dragend
    }

    // --- Utility ---
    function getSuitClass(suitKey) {
        const suitLower = suitKey.toLowerCase();
        if (suitLower === 'h') return 'hearts';
        if (suitLower === 'd') return 'diamonds';
        if (suitLower === 's') return 'spades';
        if (suitLower === 'c') return 'clubs';
        return '';
    }
});
