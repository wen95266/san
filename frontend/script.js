// ... (大部分 script.js 代码与上一版类似，我们只关注新增和修改的部分) ...

document.addEventListener('DOMContentLoaded', () => {
    // ... (DOM Elements, API_URL, Card visuals & values, Game State as before) ...
    const aiSuggestButton = document.getElementById('ai-suggest-button');
    // const ai托管Button = document.getElementById('ai-托管-button'); // 托管功能复杂，暂不实现

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // ... (deal, submit, reset, sort buttons as before) ...
        dealButton.addEventListener('click', handleDealNewHand);
        submitButton.addEventListener('click', handleSubmitHand);
        resetButton.addEventListener('click', handleResetArrangement);
        sortButton.addEventListener('click', handleSortHand);
        aiSuggestButton.addEventListener('click', handleAiSuggest); // 新增

        // ... (Drag and Drop listeners as before) ...
    }

    // --- UI Update Functions ---
    // showGameMessage, resetGameUI, updatePileCountsAndLabels (可能需要微调以显示牌型名称)
    function displayHandAnalysis(analysis) {
        if (!analysis) return;
        const displayArea = document.createElement('div');
        displayArea.style.marginTop = '10px';
        displayArea.style.padding = '10px';
        displayArea.style.border = '1px solid #ccc';
        displayArea.style.backgroundColor = '#f0f0f0';
        displayArea.style.color = '#333';
        displayArea.innerHTML = `<h4>牌型分析:</h4>
            <p>头墩: ${analysis.front.name || '未知'} (${analysis.front.cards.join(', ')})</p>
            <p>中墩: ${analysis.middle.name || '未知'} (${analysis.middle.cards.join(', ')})</p>
            <p>尾墩: ${analysis.back.name || '未知'} (${analysis.back.cards.join(', ')})</p>`;

        // 清除旧的分析结果（如果存在）
        const oldAnalysis = document.getElementById('hand-analysis-display');
        if (oldAnalysis) oldAnalysis.remove();
        displayArea.id = 'hand-analysis-display';

        // 将分析结果添加到某个显眼位置，例如主游戏区域下方或消息区
        const mainGameArea = document.getElementById('main-game-area');
        mainGameArea.appendChild(displayArea); // 或者其他你选择的位置
    }


    // --- Game Action Handlers ---
    async function handleDealNewHand() {
        // ... (发牌逻辑) ...
        // 清除上一局的牌型分析
        const oldAnalysis = document.getElementById('hand-analysis-display');
        if (oldAnalysis) oldAnalysis.remove();
        // ... (其他发牌逻辑，显示AI按钮等)
        // ... (代码与上一版类似，确保显示AI建议按钮)
        aiSuggestButton.style.display = 'inline-block';
        // document.getElementById('ai-托管-button').style.display = 'inline-block'; // 托管暂不实现
    }


    async function handleAiSuggest() {
        if (currentMyHandCards.length === 0 && originalHand.length === 0) {
            showGameMessage('请先发牌后再使用AI建议。', 'error');
            return;
        }
        // AI 建议应该基于当前手牌区和未摆放的牌，或者原始13张牌
        // 为简单起见，我们基于 originalHand (如果玩家已理牌，这可能不是最佳选择)
        // 或者，更好的做法是收集所有未放入墩的牌 + 已放入墩的牌，组成当前完整的13张。
        // 目前我们用 originalHand，如果游戏已开始且有牌在手牌区，则用手牌区。

        let handToSuggest = [];
        if (currentMyHandCards.length > 0) { // 如果手牌区有牌 (意味着可能已部分理牌)
            // 合并手牌区和已摆放的牌
            handToSuggest = currentMyHandCards.map(c => c.value)
                             .concat(frontHandData.map(c => c.value))
                             .concat(middleHandData.map(c => c.value))
                             .concat(backHandData.map(c => c.value));
            // 去重，确保是13张
            handToSuggest = [...new Set(handToSuggest)];
            if (handToSuggest.length !== 13 && originalHand.length === 13) {
                // 如果合并后不是13张，可能逻辑有误，退回使用原始手牌
                console.warn("AI Suggest: Failed to reconstruct 13 cards, using original hand.");
                handToSuggest = [...originalHand];
            } else if (handToSuggest.length !== 13) {
                 showGameMessage('AI建议需要完整的13张手牌信息。', 'error');
                 return;
            }

        } else if (originalHand.length === 13) {
            handToSuggest = [...originalHand];
        } else {
            showGameMessage('没有足够的手牌进行AI建议。', 'error');
            return;
        }


        showGameMessage('AI正在思考建议...', 'info');
        aiSuggestButton.disabled = true;

        try {
            const response = await fetch(`${API_URL}?action=aiSuggest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hand: handToSuggest }),
            });
            const result = await response.json();

            if (result.success && result.suggestion) {
                showGameMessage('AI建议已生成 (仅供参考，不保证最优或不倒水！)', 'info');
                // 将建议的牌自动摆放到牌墩 (用户体验好)
                // 1. 清空现有牌墩
                handleResetArrangement(); // 这会把所有牌移回手牌区

                // 2. 从手牌区找到建议的牌并移动到对应牌墩
                placeSuggestedCards(result.suggestion.front, frontHandPileWrapper, frontHandData);
                placeSuggestedCards(result.suggestion.middle, middleHandPileWrapper, middleHandData);
                placeSuggestedCards(result.suggestion.back, backHandPileWrapper, backHandData);

                updatePileCountsAndLabels();
                checkIfReadyToSubmit();

            } else {
                showGameMessage(`AI建议失败：${result.message || '未知错误'}`, 'error');
            }
        } catch (error) {
            console.error('AI建议请求失败:', error);
            showGameMessage(`AI建议请求异常：${error.message}`, 'error');
        } finally {
            aiSuggestButton.disabled = false;
        }
    }

    function placeSuggestedCards(suggestedCardsArray, targetPileWrapper, targetPileDataArray) {
        suggestedCardsArray.forEach(cardValueToPlace => {
            const cardIndexInHand = currentMyHandCards.findIndex(cardObj => cardObj.value === cardValueToPlace);
            if (cardIndexInHand > -1) {
                const cardObj = currentMyHandCards.splice(cardIndexInHand, 1)[0]; // 从手牌数据中移除
                targetPileDataArray.push(cardObj); // 添加到墩数据
                targetPileWrapper.appendChild(cardObj.element); // 移动DOM元素
            } else {
                console.warn(`AI Suggest: Card ${cardValueToPlace} not found in current hand to place in pile.`);
            }
        });
        renderMyHandCards(); // 更新手牌区（如果还有剩余的牌，理论上AI建议会用完13张）
    }


    async function handleSubmitHand() {
        // ... (获取三墩牌的逻辑不变) ...
        const frontValues = frontHandData.map(c => c.value);
        const middleValues = middleHandData.map(c => c.value);
        const backValues = backHandData.map(c => c.value);

        if (frontValues.length !== 3 || middleValues.length !== 5 || backValues.length !== 5) {
            showGameMessage('牌墩张数不正确！请确保头3中5尾5。', 'error');
            return;
        }

        const payload = {
            front: frontValues,
            middle: middleValues,
            back: backValues
        };

        showGameMessage('正在提交牌型...', 'info');
        // ... (禁用按钮等UI操作) ...
        submitButton.disabled = true;
        resetButton.disabled = true;
        sortButton.disabled = true;
        aiSuggestButton.disabled = true;
        myPlayerStatusElement.textContent = "比牌中...";
        myPlayerStatusElement.className = 'player-status';

        // 清除上一局的牌型分析
        const oldAnalysis = document.getElementById('hand-analysis-display');
        if (oldAnalysis) oldAnalysis.remove();

        try {
            const response = await fetch(`${API_URL}?action=submitHand`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();

            if (!response.ok) { // HTTP error status
                throw new Error(result.message || `提交失败: HTTP ${response.status}`);
            }

            if (result.success) {
                showGameMessage(`比牌完成！${result.message || ''} 得分: ${result.score || 0}`, 'success');
                if (result.analysis) {
                    displayHandAnalysis(result.analysis); // 显示后端分析的牌型
                }
                myPlayerStatusElement.textContent = "本局结束";
                myPlayerStatusElement.className = 'player-status waiting';
                // 可以在这里更新总积分 myPlayerScoreElement
                // submitButton.style.display = 'none'; // 隐藏提交按钮，直到下一局
            } else { // 后端逻辑验证失败 (例如倒水)
                showGameMessage(`提交被拒：${result.message}`, 'error');
                if (result.analysis) { // 如果后端返回了分析（例如倒水时也分析牌型）
                    displayHandAnalysis(result.analysis);
                }
                myPlayerStatusElement.textContent = "理牌错误";
                myPlayerStatusElement.className = 'player-status error';
                // 重新启用按钮让玩家修改
                submitButton.disabled = false;
                resetButton.disabled = false;
                sortButton.disabled = false;
                aiSuggestButton.disabled = false;
            }
        } catch (error) {
            console.error('提交牌型失败:', error);
            showGameMessage(`提交出错：${error.message}`, 'error');
            myPlayerStatusElement.textContent = "提交异常";
            myPlayerStatusElement.className = 'player-status error';
            // 重新启用按钮
            submitButton.disabled = false;
            resetButton.disabled = false;
            sortButton.disabled = false;
            aiSuggestButton.disabled = false;
        }
    }

    // ... (checkIfReadyToSubmit, Drag and Drop Handlers, Utility functions as before) ...
    // 确保在 handleDrop 和 handleResetArrangement 中调用 updatePileCountsAndLabels();
    // 确保在 dragstart 时，如果卡牌来自牌墩，正确记录 draggedCard.sourcePile

});
