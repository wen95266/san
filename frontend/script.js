document.addEventListener('DOMContentLoaded', () => {
    const dealButton = document.getElementById('deal-button');
    const submitButton = document.getElementById('submit-button'); // 暂未实现功能
    const myCardsContainer = document.getElementById('my-cards');
    const gameMessage = document.getElementById('game-message');

    // 后端 API 地址 (你需要修改为你在 Serv00 上的实际地址)
    // 假设你的 Serv00 用户名是 'myuser' 并且你把 backend 文件夹的内容放在了 'public_html/thirteen_api/'
    const API_URL = 'https://9526.ip-ddns.com/thirteen_api/api.php';
    // 或者，如果你在本地测试PHP，可能是：
    // const API_URL = 'http://localhost/path/to/your/backend/api.php';

    // 卡牌花色和点数的简单映射
    const suits = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };
    const ranks = { 'A': 'A', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K' };

    dealButton.addEventListener('click', dealCards);

    async function dealCards() {
        gameMessage.textContent = '正在发牌...';
        myCardsContainer.innerHTML = ''; // 清空手牌区域
        dealButton.disabled = true;

        try {
            const response = await fetch(`${API_URL}?action=deal`, {
                method: 'GET', // 或者 POST 如果你需要发送数据
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.hand) {
                displayCards(data.hand);
                gameMessage.textContent = '请理牌 (理牌功能待实现)';
                // submitButton.style.display = 'inline-block'; // 准备提交（但功能未实现）
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

    function displayCards(cards) {
        myCardsContainer.innerHTML = ''; // 清空
        cards.forEach(cardStr => { // cardStr 假设是 "H A" 格式
            const [suitKey, rankKey] = cardStr.split(' ');
            const cardDiv = document.createElement('div');
            cardDiv.classList.add('card');
            cardDiv.classList.add(getSuitClass(suitKey)); // 用于颜色

            const rankSpan = document.createElement('span');
            rankSpan.classList.add('rank');
            rankSpan.textContent = ranks[rankKey] || rankKey;

            const suitSpan = document.createElement('span');
            suitSpan.classList.add('suit');
            suitSpan.textContent = suits[suitKey] || suitKey;

            cardDiv.appendChild(rankSpan);
            cardDiv.appendChild(suitSpan);
            myCardsContainer.appendChild(cardDiv);
        });
    }

    function getSuitClass(suitKey) {
        if (suitKey === 'H') return 'hearts';
        if (suitKey === 'D') return 'diamonds';
        if (suitKey === 'S') return 'spades';
        if (suitKey === 'C') return 'clubs';
        return '';
    }

    // 初始提示
    gameMessage.textContent = '点击“发牌”开始新游戏。';
});
