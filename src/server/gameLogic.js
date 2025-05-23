// 德州扑克游戏核心逻辑
class PokerGame {
  constructor() {
    this.players = [];
    this.deck = [];
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.currentPlayerIndex = 0;
    this.gameState = 'WAITING';
  }

  // 初始化游戏
  initGame(players) {
    this.players = players;
    this.shuffleDeck();
    this.gameState = 'PREFLOP';
  }

  // 洗牌
  shuffleDeck() {
    // 初始化52张标准扑克牌
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    
    this.deck = [];
    for (const suit of suits) {
      for (const value of values) {
        this.deck.push({suit, value});
      }
    }
    
    // Fisher-Yates洗牌算法
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  // 发牌
  dealCards() {
    // 给每个玩家发两张底牌
    for (let i = 0; i < 2; i++) {
      for (const player of this.players) {
        if (!player.cards) player.cards = [];
        player.cards.push(this.deck.pop());
      }
    }
    
    // 根据游戏阶段发公共牌
    switch(this.gameState) {
      case 'PREFLOP':
        // 发三张翻牌
        this.communityCards = this.deck.splice(0, 3);
        this.gameState = 'FLOP';
        break;
      case 'FLOP':
        // 发一张转牌
        this.communityCards.push(this.deck.pop());
        this.gameState = 'TURN';
        break;
      case 'TURN':
        // 发一张河牌
        this.communityCards.push(this.deck.pop());
        this.gameState = 'RIVER';
        break;
    }
  }

  /**
   * 处理玩家行动
   * @param {string} playerId - 玩家ID
   * @param {string} action - 行动类型(FOLD/CHECK/CALL/RAISE)
   * @param {number} [amount] - 加注金额(仅RAISE时需要)
   * @returns {boolean} 行动是否成功执行
   */
  handlePlayerAction(playerId, action, amount) {
    // 查找指定玩家，如果玩家不存在或已弃牌则返回false
    const player = this.players.find(p => p.id === playerId);
    if (!player || player.folded) return false;

    // 根据行动类型处理不同逻辑
    switch(action) {
      case 'FOLD':  // 弃牌
        player.folded = true;  // 标记玩家为已弃牌
        break;
      case 'CHECK':  // 看牌
        // 当前有下注时不能看牌
        if (this.currentBet > 0) return false;
        break;
      case 'CALL':  // 跟注
        // 当前没有下注时不能跟注
        if (this.currentBet === 0) return false;
        // 计算需要跟注的金额(当前下注 - 玩家已下注)
        const callAmount = this.currentBet - (player.currentBet || 0);
        // 检查玩家筹码是否足够
        if (player.chips < callAmount) return false;
        // 扣除玩家筹码并更新下注状态
        player.chips -= callAmount;
        player.currentBet = this.currentBet;
        this.pot += callAmount;  // 将跟注金额加入奖池
        break;
      case 'RAISE':  // 加注
        // 加注金额必须大于当前下注
        if (amount <= this.currentBet) return false;
        // 检查玩家筹码是否足够(加注金额 - 玩家已下注)
        if (player.chips < amount - (player.currentBet || 0)) return false;
        // 计算实际加注金额并更新状态
        const raiseAmount = amount - (player.currentBet || 0);
        player.chips -= raiseAmount;
        player.currentBet = amount;
        this.currentBet = amount;  // 更新当前轮次的下注金额
        this.pot += raiseAmount;   // 将加注金额加入奖池
        break;
      default:
        return false;
    }

    // 切换到下一个玩家
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    return true;  // 行动成功执行
  }

  // 比牌
  compareHands() {
    // 为每个玩家计算最佳5张牌组合
    const playerHands = this.players
      .filter(player => !player.folded)
      .map(player => {
        // 合并玩家手牌和公共牌
        const allCards = [...player.cards, ...this.communityCards];
        // 找出最佳5张牌组合
        return this.evaluateHand(allCards);
      });

    // 比较所有玩家的牌型
    let bestHand = null;
    const winners = [];
    
    for (let i = 0; i < playerHands.length; i++) {
      const hand = playerHands[i];
      
      if (!bestHand || this.compareTwoHands(hand, bestHand) > 0) {
        bestHand = hand;
        winners = [this.players[i].id];
      } else if (this.compareTwoHands(hand, bestHand) === 0) {
        winners.push(this.players[i].id);
      }
    }
    
    return winners;
  }

  // 评估牌型
  evaluateHand(cards) {
    // 按牌值排序
    const sortedCards = [...cards].sort((a, b) => this.getCardValue(b.value) - this.getCardValue(a.value));
    
    // 检查各种牌型
    const isFlush = this.checkFlush(sortedCards);
    const isStraight = this.checkStraight(sortedCards);
    const cardCounts = this.getCardCounts(sortedCards);
    
    // 同花顺
    if (isFlush && isStraight) {
      return {
        type: 'STRAIGHT_FLUSH',
        cards: sortedCards.slice(0, 5),
        kickers: []
      };
    }
    
    // 四条
    if (cardCounts.some(c => c.count === 4)) {
      const fourOfAKind = cardCounts.find(c => c.count === 4);
      const kicker = cardCounts.find(c => c.value !== fourOfAKind.value);
      return {
        type: 'FOUR_OF_A_KIND',
        cards: sortedCards.filter(c => c.value === fourOfAKind.value),
        kickers: [kicker.value]
      };
    }
    
    // 葫芦(三条+对子)
    if (cardCounts.some(c => c.count === 3) && cardCounts.some(c => c.count === 2)) {
      const threeOfAKind = cardCounts.find(c => c.count === 3);
      const pair = cardCounts.find(c => c.count === 2);
      return {
        type: 'FULL_HOUSE',
        cards: sortedCards.filter(c => c.value === threeOfAKind.value || c.value === pair.value),
        kickers: []
      };
    }
    
    // 同花
    if (isFlush) {
      return {
        type: 'FLUSH',
        cards: sortedCards.slice(0, 5),
        kickers: []
      };
    }
    
    // 顺子
    if (isStraight) {
      return {
        type: 'STRAIGHT',
        cards: sortedCards.slice(0, 5),
        kickers: []
      };
    }
    
    // 三条
    if (cardCounts.some(c => c.count === 3)) {
      const threeOfAKind = cardCounts.find(c => c.count === 3);
      const kickers = cardCounts
        .filter(c => c.value !== threeOfAKind.value)
        .sort((a, b) => b.value - a.value)
        .slice(0, 2)
        .map(c => c.value);
      return {
        type: 'THREE_OF_A_KIND',
        cards: sortedCards.filter(c => c.value === threeOfAKind.value),
        kickers
      };
    }
    
    // 两对
    if (cardCounts.filter(c => c.count === 2).length >= 2) {
      const pairs = cardCounts
        .filter(c => c.count === 2)
        .sort((a, b) => b.value - a.value)
        .slice(0, 2);
      const kicker = cardCounts
        .find(c => c.count === 1 && !pairs.some(p => p.value === c.value));
      return {
        type: 'TWO_PAIR',
        cards: sortedCards.filter(c => pairs.some(p => p.value === c.value)),
        kickers: [kicker.value]
      };
    }
    
    // 一对
    if (cardCounts.some(c => c.count === 2)) {
      const pair = cardCounts.find(c => c.count === 2);
      const kickers = cardCounts
        .filter(c => c.value !== pair.value)
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
        .map(c => c.value);
      return {
        type: 'PAIR',
        cards: sortedCards.filter(c => c.value === pair.value),
        kickers
      };
    }
    
    // 高牌
    return {
      type: 'HIGH_CARD',
      cards: sortedCards.slice(0, 5),
      kickers: []
    };
  }

  // 检查同花
  checkFlush(cards) {
    const suitCounts = {};
    cards.forEach(card => {
      suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
      if (suitCounts[card.suit] >= 5) return true;
    });
    return false;
  }

  // 检查顺子
  checkStraight(cards) {
    const uniqueValues = [...new Set(cards.map(c => this.getCardValue(c.value)))];
    if (uniqueValues.length < 5) return false;
    
    // 检查A-5-4-3-2的特殊顺子
    if (uniqueValues.includes(14) && uniqueValues.includes(5) && 
        uniqueValues.includes(4) && uniqueValues.includes(3) && uniqueValues.includes(2)) {
      return true;
    }
    
    // 检查普通顺子
    for (let i = 0; i <= uniqueValues.length - 5; i++) {
      if (uniqueValues[i] - uniqueValues[i + 4] === 4) {
        return true;
      }
    }
    
    return false;
  }

  // 统计牌值出现次数
  getCardCounts(cards) {
    const counts = {};
    cards.forEach(card => {
      counts[card.value] = (counts[card.value] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([value, count]) => ({
        value: this.getCardValue(value),
        count
      }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.value - a.value;
      });
  }

  // 比较两手牌
  compareTwoHands(hand1, hand2) {
    const handRank = {
      'STRAIGHT_FLUSH': 9,
      'FOUR_OF_A_KIND': 8,
      'FULL_HOUSE': 7,
      'FLUSH': 6,
      'STRAIGHT': 5,
      'THREE_OF_A_KIND': 4,
      'TWO_PAIR': 3,
      'PAIR': 2,
      'HIGH_CARD': 1
    };
    
    // 比较牌型等级
    if (handRank[hand1.type] !== handRank[hand2.type]) {
      return handRank[hand1.type] - handRank[hand2.type];
    }
    
    // 同牌型比较关键牌
    const compareCards = (a, b) => {
      for (let i = 0; i < Math.min(a.length, b.length); i++) {
        const diff = this.getCardValue(b[i].value) - this.getCardValue(a[i].value);
        if (diff !== 0) return diff;
      }
      return 0;
    };
    
    // 比较主牌
    const mainDiff = compareCards(hand1.cards, hand2.cards);
    if (mainDiff !== 0) return mainDiff;
    
    // 比较边牌
    for (let i = 0; i < Math.min(hand1.kickers.length, hand2.kickers.length); i++) {
      const diff = this.getCardValue(hand2.kickers[i]) - this.getCardValue(hand1.kickers[i]);
      if (diff !== 0) return diff;
    }
    
    return 0;
  }

  // 获取牌值对应的数字
  getCardValue(value) {
    const values = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
      '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };
    return values[value];
  }

  // 下一轮
  nextRound() {
    // 实现轮次切换
  }
}