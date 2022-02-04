"use strict";

(function () {
  // ========================================================
  // BUTTONS

  // RESET BUTTON
  const restartButton = document.querySelector("#restart_button");
  const hitButton = document.querySelector("#hit_button");
  const standButton = document.querySelector("#stand_button");
  const fullScreen = document.querySelector("#fullscreen");

  restartButton.onclick = () => {
    game.player.reset();
    game.dealer.reset();
    game.state = "INIT";
    game.play();
  };

  // HIT BUTTON
  hitButton.onclick = () => {
    game.hit();
    renderCards(game.state === "PLAYING");
  };

  // STAND BUTTON
  standButton.onclick = () => {
    game.stand();
    renderCards(game.state === "PLAYING");
  };

  // FULLSCREEN BUTTON
  fullScreen.onclick = function toggleFullScreen() {
    var doc = window.document;
    var docEl = doc.documentElement;

    var requestFullScreen =
      docEl.requestFullscreen ||
      docEl.mozRequestFullScreen ||
      docEl.webkitRequestFullScreen ||
      docEl.msRequestFullscreen;
    var cancelFullScreen =
      doc.exitFullscreen ||
      doc.mozCancelFullScreen ||
      doc.webkitExitFullscreen ||
      doc.msExitFullscreen;

    if (
      !doc.fullscreenElement &&
      !doc.mozFullScreenElement &&
      !doc.webkitFullscreenElement &&
      !doc.msFullscreenElement
    ) {
      requestFullScreen.call(docEl);
    } else {
      cancelFullScreen.call(doc);
    }
  };

  // BUTTONS END
  // ========================================================

  // ========================================================
  // LAYOUT
  const gameBlock = document.querySelector("#game");
  const actions = document.querySelectorAll(".action");
  const dealerInner = document.querySelector("#dealer_inner");
  const dealerCards = document.querySelector("#dealer_cards");
  const dealerCount = document.querySelector("#dealer_count");
  const playerInner = document.querySelector("#player_inner");
  const playerCards = document.querySelector("#player_cards");
  const playerCount = document.querySelector("#player_count");
  const result = document.querySelector("#result");
  const resultsTotal = document.querySelector("#results_total");
  const dealerAvatar = document.querySelector(".dealer_avatar");

  const cardFace = (value) => `
                <div class="card">
                    <div class="value">${value}</div>
                    <div class="face"></div>
                </div>
            `;

  const cardFront = () => `
                <div class="card">
                    <div class="back"></div>
                </div>
            `;

  // Show cards
  const renderCards = (hideDealersCards) => {
    if (hideDealersCards)
      dealerCards.innerHTML = game.dealer.cards
        .map((card, index) => (index === 0 ? cardFace(card.name) : cardFront()))
        .join("");
    else
      dealerCards.innerHTML = game.dealer.cards
        .map((card, index) => cardFace(card.name))
        .join("");

    if (hideDealersCards) {
      dealerCount.className = "hide";
    } else {
      dealerCount.className = "";
      dealerCount.innerText = game.dealer.countCards();
    }

    playerCards.innerHTML = game.player.cards
      .map((card, index) => cardFace(card.name))
      .join("");
    playerCount.innerText = game.player.countCards();
  };

  const dealerRegular = () => {
    dealerAvatar.classList.remove("lose");
    dealerAvatar.classList.remove("win");
  };

  const dealerWon = () => {
    dealerAvatar.classList.remove("lose");
    dealerAvatar.classList.add("win");
  };

  const dealerLost = () => {
    dealerAvatar.classList.add("lose");
    dealerAvatar.classList.remove("win");
  };

  const setResult = (text) => {
    result.innerHTML = text;
    showActions(false);
  };

  const showActions = (show) =>
    [...actions].map((a) =>
      show ? a.classList.remove("hide") : a.classList.add("hide")
    );

  // END Layout
  // ========================================================

  // ========================================================
  // GAME CORE

  // Results
  const resultsObj = { win: 0, lose: 0 };
  const results = new Proxy(resultsObj, {
    set: listenResults,
  });

  function listenResults(target, key, value) {
    target[key] = value;

    resultsTotal.innerText = `WIN: ${target.win},  LOSE: ${target.lose}`;

    return true;
  }

  // Player object
  const player = {
    cards: [],
    addCards(cards) {
      this.cards.push(...cards);
    },
    getCards() {
      return this.cards;
    },
    countCards() {
      const cardsSum = this.cards
        .filter((card) => card.name !== "A")
        .map((card) => card.value)
        .reduce((x, y) => x + y, 0);
      const aces = this.cards.filter((card) => card.name === "A");
      const variants = aces
        .map((card, index) => aces.length + 10 * index)
        .reverse();

      for (let i = 0; i < variants.length; i++) {
        const sum = cardsSum + variants[i];
        if (sum <= 21) return sum;
      }

      return cardsSum + (variants[0] ? variants[0] : 0);
    },
    reset() {
      this.cards = [];
    },
  };

  // Copy dealer object from player
  const dealer = Object.assign({}, player);

  // Game as state mahine
  const gameObj = {
    state: null,
    dealer,
    player,

    transitions: {
      INIT: {
        play() {
          playerGetCard(this.player, 2);
          dealerGetCard(this.dealer, 2);
          this.state = "PLAYING";
        },
      },
      PLAYING: {
        hit() {
          playerGetCard(this.player);
          dealerGetCard(this.dealer);
          this.checkResult();
        },
        stand() {
          dealerGetCard(this.dealer);
          this.checkResult();
        },
        blackjack() {
          this.state = "BLACKJACK";
        },
        win() {
          this.state = "WIN";
        },
        lose() {
          this.state = "LOSE";
        },
      },
      WIN: {
        init() {
          this.state = "INIT";
        },
      },
      BLACKJACK: {
        init() {
          this.state = "INIT";
        },
      },
      LOSE: {
        init() {
          this.state = "INIT";
        },
      },
    },
    dispatch(actionName) {
      const action = this.transitions[this.state][actionName];

      if (action) {
        action.call(this);
      } else {
      }
    },
    checkResult() {
      if (this.player.countCards() === 21) this.dispatch("blackjack");
      if (this.player.countCards() > 21) this.dispatch("lose");
      if (this.dealer.countCards() > 21) this.dispatch("win");
      if (this.player.countCards() > this.dealer.countCards())
        this.dispatch("win");
      else this.dispatch("lose");
    },
    play() {
      this.dispatch("play");
    },
    hit() {
      this.dispatch("hit");
    },
    stand() {
      this.dispatch("stand");
    },
  };

  // Proxies game to listen state changes
  var game = new Proxy(gameObj, {
    set: listenState,
  });

  // needs too return true if action is successful
  const stateActions = {
    onInit() {
      renderCards(true);
      restartButton.innerText = "RESTART";
      setResult(`&nbsp;`);
      showActions(true);
      dealerRegular();

      return true;
    },
    onPlaying() {
      renderCards(true);

      return true;
    },
    onWin(text) {
      result.className = "won";
      setResult(text);
      renderCards();

      dealerLost();

      results.win += 1;

      return true;
    },
    onLose(text) {
      result.className = "lost";
      setResult(text);
      renderCards();

      dealerWon();

      results.lose += 1;

      return true;
    },
  };

  // Listens to game state and reacts to its changes
  function listenState(target, key, value) {
    target[key] = value;

    switch (value) {
      case "INIT":
        return stateActions.onInit();
      case "PLAYING":
        return stateActions.onPlaying();
      case "LOSE":
        return stateActions.onLose("You lost!");
      case "WIN":
        return stateActions.onWin("You win!");
      case "BLACKJACK":
        return stateActions.onWin("Blackjack! You win!");
      default:
        return true;
    }
  }

  const getRandomInt = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const getCard = (number) => {
    var cards = [
      { name: "6", value: 6 },
      { name: "7", value: 7 },
      { name: "8", value: 8 },
      { name: "9", value: 9 },
      { name: "10", value: 10 },
      { name: "J", value: 10 },
      { name: "Q", value: 10 },
      { name: "K", value: 10 },
      { name: "A", value: null /* 1 or 11 */ },
    ];

    return [...Array(number)].map(
      (x) => cards[getRandomInt(0, cards.length - 1)]
    );
  };

  const dealerGetCard = (dealer, number) => {
    if (dealer.countCards() < 17) dealer.addCards(getCard(number));
  };

  const playerGetCard = (player, number) => {
    player.addCards(getCard(number));
  };

  // GAME CORE END
  // ========================================================
})();
