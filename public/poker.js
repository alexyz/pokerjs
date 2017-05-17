(function () {
	"use strict";
	
	/* https://github.com/alexyz/pokerjs */

	// all values are valid hex numbers
	// rf sf fk fh fl st 3t tp pa hc ->
	// a  9  8  7  6  5  4  3  2  1
	// akqjt98765432 ->
	// edcba98765432
	// low value prefixed with e,f

	var deckArr = [
		"ec", "dc", "cc", "bc", "ac", "9c", "8c", "7c", "6c", "5c", "4c", "3c", "2c",
		"ed", "dd", "cd", "bd", "ad", "9d", "8d", "7d", "6d", "5d", "4d", "3d", "2d",
		"eh", "dh", "ch", "bh", "ah", "9h", "8h", "7h", "6h", "5h", "4h", "3h", "2h",
		"es", "ds", "cs", "bs", "as", "9s", "8s", "7s", "6s", "5s", "4s", "3s", "2s",
	];

	/** map of high card hand value to straight value */
	var straights = {
		"1edcba": "5e",
		"1dcba9": "5d",
		"1cba98": "5c",
		"1ba987": "5b",
		"1a9876": "5a",
		"198765": "59",
		"187654": "58",
		"176543": "57",
		"165432": "56",
		"1e5432": "55"
	};

	/** array of parse int 16 value to human readable face */
	var faces = [
		null, null, "2", "3",
		"4", "5", "6", "7",
		"8", "9", "T", "J",
		"Q", "K", "A"
	];

	var suits = {
		d: "\u2666",
		c: "\u2663",
		h: "\u2665",
		s: "\u2660"
	};

	var ranks = {
		royalFlush: "a",
		straightFlush: "9",
		fourOfAKind: "8",
		fullHouse: "7",
		flush: "6",
		straight: "5",
		threeOfAKind: "4",
		twoPair: "3",
		pair: "2",
		highCard: "1"
	};

	var ranknames = {
		"1": ["HC", "High Card"],
		"2": ["P", "Pair"],
		"3": ["2P", "Two Pair"],
		"4": ["3K", "Three of a Kind"],
		"5": ["S", "Straight"],
		"6": ["F", "Flush"],
		"7": ["FH", "Full House"],
		"8": ["4K", "Four of a Kind"],
		"9": ["SF", "Straight Flush"],
		"a": ["RF", "Royal Flush"],
		"e": ["af", "A-5 Low"],
		"f": ["ds", "2-7 Low"]
	};

	function isLow (v) {
		var t = v.substring(0,1);
		return t === "e" || t === "f";
	}

	function rank (v) {
		if (isLow(v)) {
			v = inverseValue(v.substring(1));
		}
		return v[0];
	}

	/** convert high value to low value (sort of 0-value) */
	function inverseValue (v) {
		var x = "";
		for (var n = 0; n < v.length; n++) {
			x += (15 - parseInt(v[n], 16)).toString(16);
		}
		return x;
	}

	/** deuce to seven low value */
	function dsLowValue (hand) {
		var v = value(hand);
		if (v == "95") {
			// convert 5-high straight flush to a5432-high flush
			v = "6e5432";
		} else if (v == "55") {
			// convert 5-high straight to a5432-high
			v = "1e5432";
		}
		return "f" + inverseValue(v);
	}

	/** 8 or better low value (null for no low) */
	function afLowValue (hand) {
		validateHand(hand);
		var v = pairValue(hand);
		if (v[0] === ranks.highCard && parseInt(v[1],16) <= 8) {
			return "e" + inverseValue(v);
		} else {
			return null;
		}
	}

	/** throw exception if hand is not 5 unique cards */
	function validateHand (hand) {
		if (hand.length !== 5) {
			throw "value " + hand;
		}
		for (var n = 0; n < 5; n++) {
			if (typeof hand[n] !== "string" || hand[n].length !== 2) {
				throw "value " + hand;
			}
			for (var n2 = n+1; n2 < 5; n2++) {
				if (hand[n] === hand[n2]) {
					throw "value " + hand;
				}
			}
		}
	}

	/** hi value */
	function value (hand) {
		validateHand(hand);
		var v = pairValue(hand);
		if (v[0] === ranks.highCard) {
			var f = isFlush(hand);
			var s = straights[v];
			if (f) {
				if (s) {
					if (s === "5e") {
						return ranks.royalFlush;
					} else {
						return ranks.straightFlush + s[1];
					}
				} else {
					return ranks.flush + v.substring(1);
				}
			} else if (s) {
				return s;
			}
		}
		return v;
	}

	function isFlush (hand) {
		var r = hand[0][1];
		for (var n = 1; n < hand.length; n++) {
			if (hand[n][1] !== r) {
				return false;
			}
		}
		return true;
	}

	/** return pair/high card value */
	function pairValue (hand) {
		var a = [];
		for (var n = 0; n < hand.length; n++) {
			var k = parseInt(hand[n][0], 16);
			if (!a[k]) {
				a[k] = 1;
			} else {
				a[k]++;
			}
		}
		var fk = "", tk = "", pa = "", hc = "";
		for (var k = a.length; k !== 0; k--) {
			switch (a[k]) {
				case 1:
					hc += k.toString(16);
					break;
				case 2:
					pa += k.toString(16);
					break;
				case 3:
					tk = k.toString(16);
					break;
				case 4:
					fk = k.toString(16);
					break;
			}
		}
		if (fk) {
			return ranks.fourOfAKind + fk + hc;
		}
		if (tk) {
			if (pa) {
				return ranks.fullHouse + tk + pa;
			} else {
				return ranks.threeOfAKind + tk + hc;
			}
		}
		if (pa) {
			if (pa.length === 2) {
				return ranks.twoPair + pa + hc;
			} else {
				return ranks.pair + pa + hc;
			}
		}
		// check fl/st
		return ranks.highCard + hc;
	}

	function shuffle (a) {
		for (var n = a.length - 1; n > 0; n--) {
			var r = randomInt(n + 1);
			var t = a[n];
			a[n] = a[r];
			a[r] = t;
		}
		return a;
	}

	/*
	function formatHand (h) {
		validate(h, h.length);
		var s = "";
		for (var n = 0; n < h.length; n++) {
			if (s) {
				s += " ";
			}
			s += formatCard(h[n]);
		}
		return s;
	}
	*/

	function formatCard (c) {
		return faces[parseInt(c[0], 16)] + suits[c[1]];
	}

	function valueDesc (v) {
		if (!v) {
			return "";
		}
		if (isLow(v)) {
			v = inverseValue(v.substring(1));
		}
		var r = v[0];
		var c1 = faces[parseInt(v[1], 16)];
		var c2 = faces[parseInt(v[2], 16)];
		var c3 = faces[parseInt(v[3], 16)];
		var c4 = faces[parseInt(v[4], 16)];
		var c5 = faces[parseInt(v[5], 16)];
		var name = ranknames[r][1];
		switch (r) {
			case ranks.highCard: return name + " " + c1 + c2 + c3 + c4 + c5;
			case ranks.pair: return name + " " + c1 + " - " + c2 + c3 + c4;
			case ranks.twoPair: return name + " " + c1 + + c2 + " - " + c3;
			case ranks.threeOfAKind: return name + " " + c1 + " - " + c2 + c3;
			case ranks.straight: return name + " " + c1;
			case ranks.flush: return name + " " + c1 + c2 + c3 + c4 + c5;
			case ranks.fullHouse: return name + " " + c1 + c2;
			case ranks.fourOfAKind: return name + " " + c1 + " - " + c2;
			case ranks.straightFlush: return name + " " + c1;
			case ranks.royalFlush: return name;
		}
		throw "valueDesc " + v;
	}

	function remove (a) {
		for (var n = 1; n < arguments.length; n++) {
			var b = arguments[n];
			if (Array.isArray(b)) {
				for (var n2 = 0; n2 < b.length; n2++) {
					remove(a, b[n2]);
				}
			} else {
				var i = a.indexOf(b);
				if (i >= 0) {
					a.splice(i, 1);
				}
			}
		}
		return a;
	}

	/** update the eqs with the simulation */
	function runEqs (hlequities, board, hands, dealf, hvaluef, lvaluef) {
		var count = 0;
		var hvals = [], lvals = [];

		while (dealf.hasnext()) {
			// deal a new board
			dealf.next(board, hands);
			count++;

			var hmax = "", lmax = "";
			var hmaxcount = 0, lmaxcount = 0;

			for (var n = 0; n < hands.length; n++) {
				var hv = hvaluef(board, hands[n]);
				hvals[n] = hv;
				if (hv === hmax) {
					hmaxcount++;
				} else if (hv > hmax) {
					hmaxcount = 1;
					hmax = hv;
				}
				if (lvaluef) {
					var lv = lvaluef(board, hands[n]);
					lvals[n] = lv;
					if (lv === lmax) {
						lmaxcount++;
					} else if (lv > lmax) {
						lmaxcount = 1;
						lmax = lv;
					}
				}
			}

			// update each hand equity
			for (var n = 0; n < hands.length; n++) {
				// if anyone got low, update the high half only
				var he = lmaxcount == 0 ? hlequities[n].high : hlequities[n].highhalf;
				var le = hlequities[n].lowhalf;

				if (hvals[n] === hmax) {
					if (hmaxcount === 1) {
						he.win++;
					} else {
						he.tie++;
					}
					var r = rank(hmax);
					var rc = he.winranks[r] || 0;
					he.winranks[r] = rc+1;
				}

				if (lmaxcount > 0 && lvals[n] == lmax) {
					if (lmaxcount === 1) {
						le.win++;
					} else {
						le.tie++;
					}
					// don't bother with winranks for low
				}

				// update count (currently on equity)
				he.count = count;
				if (lmaxcount > 0) {
					le.count = count;
				}
			}
		}
	}

	function drawValue (board, hand) {
		return value(hand);
	}

	function lowDrawValue (board, hand) {
		return dsLowValue(hand);
	}

	function drawEquity (board, hands, blockers, vf) {
		console.log("draw equity");
		if (board || hands.length < 2) throw "dequity: board/hands";
		var deck = remove(deckArr.slice(0), board, hands, blockers);
		var hands2 = [];
		var equities = [];
		var unknown = 0;
		for (var n = 0; n < hands.length; n++) {
			equities[n] = new Equity(hands[n]);
			hands2[n] = hands[n].slice(0);
			unknown = unknown + (5 - hands[n].length);
		}
		// TODO u=1,2 exact draw
		var df = unknown == 0 ? new FixedDraw() : new RandomDraw(deck, hands, 1000);
		runEqs(equities, board, hands2, df, vf);
		return equities;
	}

	function FixedDraw () {
		this.n = 0;
	}

	FixedDraw.prototype.hasnext = function () {
		return this.n == 0;
	};

	FixedDraw.prototype.next = function (board, hands) {
		this.n++;
	};

	function RandomDraw (deck, hands, max) {
		this.n = 0;
		this.max = max;
		// need original hand to know how many to draw
		this.hands = hands;
		this.deck = deck;
	}

	RandomDraw.prototype.hasnext = function () {
		return this.n < this.max;
	};

	RandomDraw.prototype.next = function (board, hands) {
		shuffle(this.deck);
		var i = 0;
		for (var n = 0; n < this.hands.length; n++) {
			for (var n2 = this.hands[n].length; n2 < 5; n2++) {
				// update parameter not field
				hands[n][n2] = this.deck[i++];
			}
		}
		//log("rd board=" + board + " hands=" + JSON.stringify(hands));
		this.n++;
	};

	/** holdem and omaha equity */
	function holdemEquity (board, hands, blockers, game) {
		console.log("holdem equity");
		if (hands.length == 0 || (board.length > 0 && (board.length < 3 || board.length > 5))) throw "heequity";
		var deck = remove(deckArr.slice(0), board, hands, blockers);
		var dealf;
		if (board.length == 0) {
			dealf = new RandomBoard(deck, 1000);
		} else if (board.length == 5) {
			dealf = new FixedBoard();
		} else if (board.length == 3) {
			dealf = new Board3(deck);
		} else if (board.length == 4) {
			dealf = new Board4(deck);
		} else {
			throw "he";
		}
		return holdemEquityImpl(board, hands, dealf, game.valueFunc, game.lowValueFunc);
	}

	function RandomBoard (deck, max) {
		this.n = 0;
		this.max = max;
		this.deck = deck.slice(0);
	}

	RandomBoard.prototype.hasnext = function () {
		return this.n < this.max;
	};

	RandomBoard.prototype.next = function (board) {
		//log("rb n=" + this.n);
		shuffle(this.deck);
		for (var n = 0; n < 5; n++) {
			board[n] = this.deck[n];
		}
		this.n++;
	};

	function FixedBoard () {
		this.n = 0;
		this.exact = true;
	}

	FixedBoard.prototype.hasnext = function () {
		return this.n < 1;
	};

	FixedBoard.prototype.next = function (board) {
		this.n++;
	};

	function Board3 (deck) {
		if (deck.length < 2) throw "board3";
		this.deck = deck;
		this.n1 = 0;
		this.n2 = 1;
		this.exact = true;
		this.outs = true;
		this.o = 0;
	}

	Board3.prototype.hasnext = function () {
		return this.n1 < this.deck.length - 2 || this.n2 < this.deck.length - 1;
	};

	Board3.prototype.next = function (board) {
		// 0=1,2 1=1,3 2=1,4 max=dl-2,dl-1
		//log("b3 n=" + this.n1 + "," + this.n2);
		board[3] = this.deck[this.n1];
		board[4] = this.deck[this.n2++];
		if (this.n2 == this.deck.length) {
			this.n1++;
			this.n2 = this.n1+1;
		}
	};

	Board3.prototype.hasouts = function () {
		return this.o < this.deck.length;
	};

	Board3.prototype.nextout = function (board) {
		board.length = 4;
		board[3] = this.deck[this.o++];
		return board[3];
	};

	function Board4 (deck) {
		if (deck.length < 1) throw "board4";
		this.deck = deck;
		this.n = 0;
		this.exact = true;
		this.outs = true;
		this.o = 0;
	}

	Board4.prototype.hasnext = function () {
		return this.n < this.deck.length - 1;
	};

	Board4.prototype.next = function (board) {
		//log("b4 n=" + this.n);
		board[4] = this.deck[this.n++];
	};

	Board4.prototype.hasouts = function () {
		return this.o < this.deck.length;
	};

	Board4.prototype.nextout = function (board) {
		board[4] = this.deck[this.o++];
		return board[4];
	};

	function HLEquity (hand) {
		if (!hand) throw "equity: no hand";
		this.hand = hand;
		this.high = new Equity();
		this.highhalf = new Equity();
		this.lowhalf = new Equity();
		this.exact = null;
		// cards remaining in deck
		this.rem = 0;
	}

	function Equity () {
		this.current = null;
		this.count = 0;
		this.win = 0;
		this.tie = 0;
		this.winranks = {};
		this.best = false;
		this.outs = [];
	}

	/** calculate high/low holdem/omaha equity, returns array of HLEquity */
	function holdemEquityImpl (board, hands, dealf, hvaluef, lvaluef) {
		console.log("holdemEquityImpl b=" + board + " h=" + hands);

		var hleqs = [];

		// get current values, create equity objects
		var hmax = "", lmax = "";
		for (var n = 0; n < hands.length; n++) {
			var hle = new HLEquity(hands[n]);
			hle.exact = dealf.exact;
			hle.rem = dealf.deck ? dealf.deck.length : 0;
			if (board.length >= 3) {
				var hv = hvaluef(board, hands[n]);
				if (hv > hmax) {
					hmax = hv;
				}
				hle.high.current = hv;
				if (lvaluef) {
					var lv = lvaluef(board, hands[n]);
					if (lv > lmax) {
						lmax = lv;
					}
					hle.lowhalf.current = lv;
				}
			}
			hleqs[n] = hle;
		}

		// get best current
		for (var n = 0; n < hands.length; n++) {
			var hle = hleqs[n];
			// always on high not highhalf
			if (hle.high.current === hmax) {
				hle.high.best = true;
			}
			if (hle.lowhalf.current && hle.lowhalf.current === lmax) {
				hle.lowhalf.best = true;
			}
		}

		var b = board.slice(0);
		var hvals = [], lvals = [];

		// get the outs for next street only
		while (dealf.outs && dealf.hasouts()) {
			// apply out to board
			var c = dealf.nextout(b);

			// get new value
			var hmax = null, lmax = null;
			for (var n = 0; n < hands.length; n++) {
				var hv = hvaluef(b, hands[n]);
				hvals[n] = hv;
				if (!hmax || hv > hmax) {
					hmax = hv;
				}
				if (lvaluef) {
					var lv = lvaluef(b, hands[n]);
					lvals[n] = lv;
					if (!lmax || lv > lmax) {
						lmax = lv;
					}
				}
			}

			for (var n = 0; n < hands.length; n++) {
				var hle = hleqs[n];
				// always on high not highhalf
				if (!hle.high.best && hvals[n] === hmax) {
					hle.high.outs.push(c);
				}
				if (lmax && !hle.lowhalf.best && lvals[n] === lmax) {
					hle.lowhalf.outs.push(c);
				}
			}
		}

		// get equities...
		runEqs(hleqs, board, hands, dealf, hvaluef, lvaluef);
		
		return hleqs;
	}

	function omahaValue (board, hand) {
		return omahaValueImpl(board, hand, value);
	}

	function omahaLowValue (board, hand) {
		return omahaValueImpl(board, hand, afLowValue);
	}

	function omahaValueImpl (board, hand, valuef) {
		//log("omvalue b=" + board + " h=" + hand);
		if (board.length < 3 || board.length > 5 || hand.length < 2 || hand.length > 4) throw "omvalue";
		for (var n = 0; n < board.length; n++) if (!board[n]) throw "omvalue";
		for (var n = 0; n < hand.length; n++) if (!hand[n]) throw "omvalue";
		// pick 2 from hand, 3 from board
		var a = [];
		var max = "";
		for (var h1 = 0; h1 < hand.length; h1++) {
			a[0] = hand[h1];
			for (var h2 = h1+1; h2 < hand.length; h2++) {
				a[1] = hand[h2];
				for (var b1 = 0; b1 < board.length; b1++) {
					a[2] = board[b1];
					for (var b2 = b1+1; b2 < board.length; b2++) {
						a[3] = board[b2];
						for (var b3 = b2+1; b3 < board.length; b3++) {
							a[4] = board[b3];
							var v = valuef(a);
							//log("omv " + a + " = " + v);
							if (v > max) {
								max = v;
							}
						}
					}
				}
			}
		}
		return max;
	}

	function holdemValue (board, hand) {
		if (board.length < 3 || board.length > 5 || hand.length !== 2) throw "hevalue";
		// pick 0-2 from hand, 3-5 from board
		var a = [];
		var max = "";
		var len = hand.length + board.length;
		for (var h1 = 0; h1 < len; h1++) {
			a[0] = h1 < 2 ? hand[h1] : board[h1 - 2];
			for (var h2 = h1+1; h2 < len; h2++) {
				a[1] = h2 < 2 ? hand[h2] : board[h2 - 2];
				for (var h3 = h2+1; h3 < len; h3++) {
					a[2] = board[h3 - 2];
					for (var h4 = h3+1; h4 < len; h4++) {
						a[3] = board[h4 - 2];
						for (var h5 = h4+1; h5 < len; h5++) {
							a[4] = board[h5 - 2];
							var v = value(a);
							if (v > max) {
								max = v;
							}
						}
					}
				}
			}
		}
		return max;
	}

	var games = {
		holdem: { 
			holdemBoard: true, 
			handMin: 2, 
			handMax: 2,
			equityFunc: holdemEquity, 
			valueFunc: holdemValue
		},
		omaha: { 
			holdemBoard: true, 
			handMin: 2, 
			handMax: 4, 
			equityFunc: holdemEquity, 
			valueFunc: omahaValue
		},
		draw: { 
			handMin: 1, 
			handMax: 5, 
			equityFunc: drawEquity, 
			valueFunc: drawValue
		},
		lowdraw: { 
			handMin: 1, 
			handMax: 5, 
			equityFunc: drawEquity, 
			valueFunc: lowDrawValue
		},
		omahahilo: {
			holdemBoard: true, 
			handMin: 2, 
			handMax: 4, 
			equityFunc: holdemEquity, 
			valueFunc: omahaValue,
			lowValueFunc: omahaLowValue
		}
	};

	function getgame () {
		var text = $("#game").find(":selected").val();
		var g = games[text];
		if (g) {
			return g;
		}
		throw "game";
	}

	function gameAction (e, ui) {
		console.log("game selected");
		var g = getgame();

		$(".deck").removeClass("selected");
		$("#board tbody").empty();
		var bt = $("#board").get(0);
		if (g.holdemBoard) {
			var btr = addHand(bt, 3, 5, true);
		}

		$("#hands tbody").empty();
		$("#hands tbody").append("<tr><th colspan=" + g.handMax + ">hand</th><th>win/tie</th><th>rank</th><th>info</th></tr>");
		var ht = $("#hands").get(0);
		for (var n = 0; n < 4; n++) {
			addHand(ht, g.handMin, g.handMax, false);
		}

		// select first hand cell...
		$(ht).find(".hand").first().addClass("current");
	}

	function addHand (t, mins, maxs, isboard) {
		var tr = t.insertRow(-1);
		$(tr).data("mins", mins);
		$(tr).data("maxs", maxs);
		$(tr).data("isb", isboard);
		$(tr).addClass("handrow");
		for (var n = 0; n < maxs; n++) {
			var td = tr.insertCell(-1);
			$(td).addClass("hand card");
			$(td).click(function(e) {
				handtdclicked(e.currentTarget);
			});
		}
		if (!isboard) {
			var td1 = tr.insertCell(-1);
			$(td1).addClass("win info");
			var td2 = tr.insertCell(-1);
			$(td2).addClass("rank info");
			var td3 = tr.insertCell(-1);
			$(td3).addClass("value info");
		}
		// highlight the outs on hover
		$(tr).hover(function(){
			var hle = $(this).data("hle");
			$(".deck").each(function(){
				var t = $(this);
				if (hle && hle.high.outs.indexOf(t.data("card")) >= 0) {
					t.addClass("out");
				}
			});
		}, function(){
			$(".deck").removeClass("out");
		});
		return tr;
	}

	/* return function */
	function rowFilter (hand) {
		return function (i,e) {
			//console.log("cf c=" + c + " data=" + $(this).data("card"));
			var f = false;
			$(this).find(".hand").each(function(i2,e2) {
				var c = $(this).data("card");
				if (c && hand.indexOf(c) >= 0) {
					f = true;
					return false;
				}
			});
			return f;
		};
	}

	function getcards () {
		var hs = { board: null, hands: [], blockers: [] };
		$(".handrow").each(function(i,tr) {
			$(tr).removeClass("error");
			var mins = $(tr).data("mins");
			var maxs = $(tr).data("maxs");
			var isb = $(tr).data("isb");
			var h = [];
			$(tr).find(".hand").each(function(i,e){
				var c = getcard(e);
				if (c) {
					h.push(c);
				}
			});
			console.log("mins=" + mins + " maxs=" + maxs + " isb=" + isb + " h=" + h);
			if (isb || h.length > 0) {
				// board can be length 0, otherwise must be at least mins
				if ((isb && h.length === 0) || h.length >= mins) {
					if (hs !== null) {
						if (isb) {
							hs.board = h;
						} else {
							hs.hands.push(h);
						}
					}
				} else {
					$(tr).addClass("error");
					hs = null;
				}
			}
		});
		return hs;
	}

	function cardFilter (c) {
		return function () {
			//console.log("cf c=" + c + " data=" + $(this).data("card"));
			return $(this).data("card") === c;
		};
	}

	function decktdclicked (dtd) {
		console.log("decktdclicked " + dtd.outerHTML);
		var c = $(dtd).data("card");
		console.log("card is " + c);

		if ($(dtd).hasClass("selected")) {
			// deselect deck card
			$(dtd).removeClass("selected");

			// delete hand card
			var handtd = $(".hand").filter(cardFilter(c));
			//handtd.removeData("card");
			//handtd.html("");
			setcard(handtd, null);

			// select deleted hand card
			$(".current").removeClass("current");
			handtd.addClass("current");

		} else {
			// get current hand card
			var htd = $(".current");
			if (!htd) return;

			// deselect old deck card
			var oc = htd.data("card");
			if (oc) {
				$(".deck").filter(cardFilter(oc)).removeClass("selected");
			}

			// select new deck card
			$(dtd).addClass("selected");

			// update hand card
			//chtd.html("<span>" + formatCard(c) + "</span>");
			//chtd.data("card", c);
			setcard(htd, c);

			// select next hand card
			var handtds = $(".hand");
			var i = handtds.index(htd);
			handtds.eq(i).removeClass("current");
			if (i+1 < handtds.length) {
				$(handtds.eq(i+1)).addClass("current");
			}
		}
	}

	function setcard (td, c) {
		if (c) {
			td.html("<span class='" + c.substring(1,2) + "'>" + formatCard(c) + "</span>");
			td.data("card", c);
		} else {
			td.empty();
			td.removeData("card");
		}
	}

	function getcard (td) {
		return $(td).data("card");
	}

	function handtdclicked (td) {
		console.log("decktdclicked " + td.outerHTML);
		// deselect others
		$(".hand").removeClass("current");
		$(td).addClass("current");
	}

	function randomInt (n) {
		return Math.floor(Math.random() * n);
	}

	function clearAction () {
		$(".hand").each(function(i,e){
			setcard($(e),null);
		});
		$(".deck").removeClass("selected");
		$(".value").empty();
		clearInfoAction();
	}

	function clearInfoAction () {
		$("#hands").find(".info").each(function(i,e) {
			$(e).empty().removeAttr('title');
		})
	}

	function randomAction () {
		clearAction();
		var players = randomInt(3) + 2; // XXX check hand rows/game
		var deck = shuffle(deckArr.slice(0));
		var g = getgame();
		if (g.holdemBoard) {
			var street = randomInt(4);
			if (street > 0) {
				var board = $("#board").find(".hand");
				for (var n = 0; n < street + 2; n++) {
					var card = deck.pop();
					setcard(board.eq(n), card);
					$(".deck").filter(cardFilter(card)).addClass("selected");
				}
			}
		}
		var handrows = $("#hands .handrow");
		for (var n = 0; n < players; n++) {
			var handlen = randomInt(g.handMax - g.handMin + 1) + g.handMin;
			var handrow = handrows.eq(n).find(".hand");
			for (var n2 = 0; n2 < handlen; n2++) {
				handrow.eq(n2).each(function() {
					var c = deck.pop();
					setcard($(this), c);
					$(".deck").filter(cardFilter(c)).addClass("selected");
				});
			}
		}
	}

	function calcAction () {
		console.log("calc action");
		var hs = getcards();
		console.log("hs=" + JSON.stringify(hs));
		var game = getgame();
		console.log("g=" + JSON.stringify(game));
		var hlequities = game.equityFunc(hs.board, hs.hands, hs.blockers, game);
		console.log("o=" + JSON.stringify(hlequities));

		clearInfoAction();
		$(".deck").removeClass("out");

		for (var n = 0; n < hlequities.length; n++) {
			var hle = hlequities[n];
			var he = hle.high;
			// the le...

			var handrow = $(".handrow").filter(rowFilter(hle.hand));
			var wins = ((100*he.win)/he.count).toFixed(0) + "%";
			var ties = ((100*he.tie)/he.count).toFixed(0) + "%";
			var besteq = ((he.win+he.tie)/he.count) >= (1/hlequities.length);

			var v1 = handrow.find(".win");
			v1.html(wins + (he.tie > 0 ? "/" + ties : "") + (besteq ? " \u{1F600} " : ""));

			var v2 = handrow.find(".rank");
			v2.html(valueDesc(he.current) + (he.best ? " \u{1F600} " : ""));

			var ranks = "";
			for (var k in he.winranks) {
				if (ranks.length > 0) ranks += " ";
				ranks += ranknames[k][0] + "(" + ((he.winranks[k]*100)/(he.win+he.tie)).toFixed(0) + "%)";
			};
			var outs = ((he.outs.length > 0) ? " outs=" + he.outs.length + "/" + hle.rem : "");
			var exs = hle.exact ? " exact" : " estimated";

			var v3 = handrow.find(".value");
			v3.html(ranks + outs + exs);
			if (he.outs.length > 0) {
				v3.attr('title', "<p>outs=" + he.outs + "</outs>");
			}

			// add data for hover
			handrow.data("hle", hle);
		}
	}

	/** init ... */
	$(function() {
		$(document).tooltip({
      		track: true,
      		content: function() { return $(this).attr('title'); }
    	});

		var dt = $("#deck").get(0);
		for (var n = 0; n < deckArr.length; n++) {
			var c = deckArr[n];
			if (n % 13 === 0) {
				var tr = dt.insertRow(-1);
			}
			// XXX tr used out of scope
			var td = tr.insertCell(-1);
			$(td).click(function(e) {
				decktdclicked(e.currentTarget);
			});

			setcard($(td), c);
			$(td).addClass("deck card");
		}

		$("button").button();
		$("#random").click(randomAction);
		$("#calc").click(calcAction);
		$("#clear").click(clearAction);
		// XXX need change here?
		$("#game").selectmenu({
			change: gameAction,
			create: gameAction
		});
	});

})();
