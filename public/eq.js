function Eq () {
	"use strict";

    // poker hand values are represented by 7 x 4 bit values (28 bits total):
	// 0x87654321
	// 7 = hand type (high, a-5 low, 2-7 low, badugi)
	// 6 = rank
	// 5 = most significant card (if any) ... 1 = least significant card
	// akqjt98765432a ->
	// edcba987654321

	var deckArr = [
		"ec", "dc", "cc", "bc", "ac", "9c", "8c", "7c", "6c", "5c", "4c", "3c", "2c",
		"ed", "dd", "cd", "bd", "ad", "9d", "8d", "7d", "6d", "5d", "4d", "3d", "2d",
		"eh", "dh", "ch", "bh", "ah", "9h", "8h", "7h", "6h", "5h", "4h", "3h", "2h",
		"es", "ds", "cs", "bs", "as", "9s", "8s", "7s", "6s", "5s", "4s", "3s", "2s",
	];

    /** high card value of straight */
    var straights = [
        // wheel to a-high
        0xe5432, 0x65432, 0x76543, 0x87654, 0x98765,
        0xa9876, 0xba987, 0xcba98, 0xdcba9, 0xedcba
    ];

	/** array of parse int 16 value to human readable face */
	var faces = [
		null, "A", "2", "3",
		"4", "5", "6", "7",
		"8", "9", "T", "J",
		"Q", "K", "A"
	];

    /** suit symbols */
	var suits = {
		d: "\u2666",
		c: "\u2663",
		h: "\u2665",
		s: "\u2660"
	};

    /** high value ranks */
	var ranks = {
		HC: 0,
		P: 0x100000,
		TP: 0x200000,
		TK: 0x300000,
		S: 0x400000,
		F: 0x500000,
		FH: 0x600000,
		FK: 0x700000,
		SF: 0x800000,
        ZZ: 0xffffff
	};

    var WHEEL = 0xe5432;

    /** valuation types */
    var types = {
        HIGH: 0,
        AFLOW: 0xe000000,
        DSLOW: 0xf000000
    };

	function rankname (v) {
        switch (rank(v)) {
            case ranks.HC: return "High Card";
		    case ranks.P: return "Pair";
            case ranks.TP: return "Two Pair";
            case ranks.TK: return "Three of a Kind";
            case ranks.S: return "Straight";
            case ranks.F: return "Flush";
            case ranks.FH: return "Full House";
            case ranks.FK: return "Four of a Kind";
            case ranks.SF: return "Straight Flush";
        }
        throw "rankname " + v;
	};

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

    /** return rank of hand (a constant in ranks object) */
    function rank (v) {
        return v & 0xf00000;
    }

	/** hi value */
	function highValue (hand) {
		validateHand(hand);
		var v = pairValue(hand);
		if (rank(v) === ranks.HC) {
			var f = isFlush(hand);
			var s = straights.indexOf(v); // 0 = 5 high str
			if (f) {
				if (s >= 0) {
                    return ranks.SF | (s + 5);
				} else {
					return ranks.F | v;
				}
			} else if (s >= 0) {
				return ranks.S | (s + 5);
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

    function faceValue (c) {
        return parseInt(c[0], 16);
    }

	/** return pair/high card value */
	function pairValue (hand) {
        // high=(-, a, k, q, j, t, 9, 8)
        // low= (7, 6, 5, 4, 3, 2, a, -)
        var cl = 0, ch = 0;
		for (var n = 0; n < hand.length; n++) {
			var k = faceValue(hand[n]);
            if (k < 8) {
                cl += (1 << (k * 4));
            } else {
                ch += (1 << ((k - 8) * 4));
            }
		}
        // AAAA2 -> ch = 0400 0000 cl = 0000 0100
		var fk = 0, tk = 0, pa = 0, hc = 0;
		for (var n = 7; n >= 0; n--) {
			var k = (ch >> (n * 4)) & 0xf; // count
            var f = n + 8; // face
            if (k == 0) {
                continue;
            } else if (k == 1) {
                hc = (hc << 4) | f;
            } else if (k == 2) {
                pa = (pa << 4) | f;
            } else if (k == 3) {
                tk = f;
            } else if (k == 4) {
                fk = f;
            }
		}
        for (var n = 7; n >= 0; n--) { // n = face
			var k = (cl >> (n * 4)) & 0xf; // count
            if (k == 0) {
                continue;
            } else if (k == 1) {
                hc = (hc << 4) | n;
            } else if (k == 2) {
                pa = (pa << 4) | n;
            } else if (k == 3) {
                tk = n;
            } else if (k == 4) {
                fk = n;
            }
		}
		if (fk) {
			return ranks.FK | (fk << 4) | hc;
		} else if (tk) {
			if (pa) {
				return ranks.FH | (tk << 4) | pa;
			} else {
				return ranks.TK | (tk << 8) | hc;
			}
		} else if (pa > 0xf) {
            return ranks.TP | (pa << 4) | hc;
        } else if (pa) {
            return ranks.P | (pa << 12) | hc;
        } else {
            return ranks.HC | hc;
        }
	}

	/** deuce to seven low value */
	function dsLowValue (hand) {
		var v = highValue(hand);
		if (v === (ranks.S | 5)) {
			// convert 5-high straight to a5432-high
			v = WHEEL;
		} else if (v === (ranks.SF | WHEEL)) {
			// convert 5-high straight flush to a5432-high flush
			v = ranks.F | WHEEL;
		}
        // invert value so lower values are higher
		return types.DSLOW | (ranks.ZZ - v);
	}

	/** 8 or better low value (qualified, maybe null) */
	function afLowValue (hand) {
		validateHand(hand);
        // ignore str/fl
		var v = pairValue(hand);
		if (rank(v) === ranks.HC) {
			if (((v >> 16) & 0xf) === 0xe) {
				// change ace high to ace low
				v = ((v & 0xffff) << 4) | 0xe;
			}
			if (((v >> 16) & 0xf) <= 8) {
                // invert so lower values are higher
				return types.AFLOW | (ranks.ZZ - v);
			}
		}
		return null;
	}

    function randomInt (n) {
		return Math.floor(Math.random() * n);
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

    /** return human readable string rep of hand */
	function formatHand (h) {
		var s = "";
		for (var n = 0; n < h.length; n++) {
			s += formatCard(h[n]);
		}
		return s;
	}

    /** return human readable string rep of card */
	function formatCard (c) {
		return faces[parseInt(c[0], 16)] + suits[c[1]];
	}

    /** return human readable description of value */
	function valueDesc (v) {
		if (!v) {
			return "?";
		}
        if (v > ranks.ZZ) {
            // convert low value to high value
            v = ranks.ZZ - (v & ranks.ZZ)
        }
		var c1 = faces[v & 0xf];
		var c2 = faces[(v >> 4) & 0xf];
		var c3 = faces[(v >> 8) & 0xf];
		var c4 = faces[(v >> 12) & 0xf];
		var c5 = faces[(v >> 16) & 0xf];
		var name = rankname(v);
		switch (rank(v)) {
			case ranks.HC: return c5 + c4 + c3 + c2 + c1 + " " + name;
			case ranks.P: return name + " " + c4 + " - " + c3 + c2 + c1;
			case ranks.TP: return name + " " + c3 + c2 + " - " + c1;
			case ranks.TK: return name + " " + c3 + " - " + c2 + c1;
			case ranks.S: return name + " " + c1;
			case ranks.F: return name + " " + c5 + c4 + c3 + c2 + c1;
			case ranks.FH: return name + " " + c2 + c1;
			case ranks.FK: return name + " " + c2 + " - " + c1;
			case ranks.SF: return name + " " + c1;
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

	function drawValue (board, hand) {
		return drawValueImpl(board, hand, highValue);
	}

	function lowDrawValue (board, hand) {
		return drawValueImpl(board, hand, dsLowValue);
	}

	function drawValueImpl (board, hand, valuef) {
		// board=0,1 hand=1-5 (ignore board if hand 5)
		if (hand.length == 5) {
			return valuef(hand);
		} else if (board.length == 1 && hand.length == 4) {
			// allow 1 card from board for outs
			var hand2 = hand.slice(0);
			hand2[4] = board[0];
			return valuef(hand);
		} else {
			return null;
		}
	}

	function drawEquity (board, hands, blockers, game) {
		console.log("draw equity");
		if (board.length > 0 || hands.length < 2) throw "draw equity board=" + board + " hands=" + hands;
		var deck = remove(deckArr.slice(0), board, hands, blockers);
		var unknown = 0;
		for (var n = 0; n < hands.length; n++) {
			unknown = unknown + (5 - hands[n].length);
		}
		// TODO u=1,2 exact draw
		console.log("unknown=" + unknown);
		var dealer = unknown == 0 ? new FixedBoard() : new RandomDraw(deck, hands, 1000);
		return equityImpl(board, hands, dealer, game.valueFunc, null);
	}

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
		if (i == 0) throw "random draw: no draws on board=" + board + " hands=" + hands;
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
		return equityImpl(board, hands, dealf, game.valueFunc, game.lowValueFunc);
	}

	function RandomBoard (deck, max) {
		this.n = 0;
		this.max = max;
		this.deck = deck.slice(0);
	}

	RandomBoard.prototype.hasnext = function () {
		return this.n < this.max;
	};

	RandomBoard.prototype.next = function (board, hands) {
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
		return this.n == 0;
	};

	FixedBoard.prototype.next = function (board, hands) {
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
		return this.n1 < this.deck.length - 1 || this.n2 < this.deck.length;
	};

	Board3.prototype.next = function (board, hands) {
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
		return this.n < this.deck.length;
	};

	Board4.prototype.next = function (board, hands) {
		//log("b4 n=" + this.n);
		board[4] = this.deck[this.n++];
	};

	Board4.prototype.hasouts = function () {
		return this.o < this.deck.length;
	};

	Board4.prototype.nextout = function (board, hands) {
		board[4] = this.deck[this.o++];
		return board[4];
	};

	/** object containing high and low equities and summaries */
	function HLEquity (hand) {
		if (!hand) throw "hlequity: no hand";
		this.hand = hand;
		this.high = new Equity();
		this.highhalf = new Equity();
		this.lowhalf = new Equity();
		this.exact = null;
		// cards remaining in deck
		this.rem = 0;
		this.highsum = new Sum();
		this.lowsum = new Sum();
	}

	function Equity () {
		this.count = 0;
		this.win = 0;
		this.tie = 0;
	}

	/** summary of high/low value */
	function Sum () {
		// current value
		this.current = null;
		// map of rank to times won (highcount+highhalf)
		this.winranks = {};
		this.best = false;
		this.outs = [];
	}

	/** calculate high/low equity, returns array of HLEquity */
	function equityImpl (board, hands, dealer, hvaluef, lvaluef) {
		console.log("equity impl b=" + board + " h=" + hands);

		var hleqs = [];

		// get current values, create equity objects
		var hmax = 0, lmax = 0;
		for (var n = 0; n < hands.length; n++) {
			var hle = new HLEquity(hands[n]);
			hle.exact = dealer.exact;
			hle.rem = dealer.deck ? dealer.deck.length : 0;
			var hv = hvaluef(board, hands[n]);
			if (hv && hv > hmax) {
				hmax = hv;
			}
			hle.highsum.current = hv;

			if (lvaluef) {
				var lv = lvaluef(board, hands[n]);
				console.log("lv of b=" + board + " h=" + hands[n] + " is " + lv);
				if (lv && lv > lmax) {
					lmax = lv;
				}
				hle.lowsum.current = lv;
			}
			
			hleqs[n] = hle;
		}

		// get best current
		for (var n = 0; n < hands.length; n++) {
			var hle = hleqs[n];
			if (hle.highsum.current === hmax) {
				hle.highsum.best = true;
			}
			console.log("hand=" + hands[n] + " lcurrent=" + hle.lowsum.current + " lmax=" + lmax);
			if (hle.lowsum.current && hle.lowsum.current === lmax) {
				console.log("it's best");
				hle.lowsum.best = true;
			}
		}

		var b = board ? board.slice(0) : [];
		var hvals = [], lvals = [];

		// get the outs for next street only
		// even for draw games, pretend there is a board to check outs
		while (dealer.outs && dealer.hasouts()) {
			// apply out to board
			var c = dealer.nextout(b);

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
				if (!hle.highsum.best && hvals[n] === hmax) {
					hle.highsum.outs.push(c);
				}
				if (!hle.lowsum.best && lvals[n] && lvals[n] === lmax) {
					hle.lowsum.outs.push(c);
				}
			}
		}

		// get equities...
		runEqs(hleqs, board, hands, dealer, hvaluef, lvaluef);
		
		return hleqs;
	}

	/** update the eqs with the simulation */
	function runEqs (hlequities, board, hands, dealer, hvaluef, lvaluef) {
		var hvals = [], lvals = [];

		// copy board/hands before mutate
		board = board.slice(0);
		hands = hands.slice(0);
		for (var n = 0; n < hands.length; n++) {
			hands[n] = hands[n].slice(0);
		}

		while (dealer.hasnext()) {
			// deal a new board
			dealer.next(board, hands);

			var hmax = 0, lmax = 0;
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
				var hle = hlequities[n];
				var xe = lmaxcount == 0 ? hle.high : hle.highhalf;
				var le = hle.lowhalf;

				if (hvals[n] === hmax) {
					if (hmaxcount === 1) {
						xe.win++;
					} else {
						xe.tie++;
					}
					var r = rank(hmax);
					var rc = hle.highsum.winranks[r] || 0;
					hle.highsum.winranks[r] = rc+1;
				}

				if (lmaxcount > 0) {
					if (lvals[n] == lmax) {
						if (lmaxcount === 1) {
							le.win++;
						} else {
							le.tie++;
						}
					}
					// don't bother with winranks for low
					le.count++;
				}

				xe.count++;
			}
		}
	}

	function omahaValue (board, hand) {
		return omahaValueImpl(board, hand, highValue);
	}

	function omahaLowValue (board, hand) {
		return omahaValueImpl(board, hand, afLowValue);
	}

	/** return omaha value (maybe null) */
	function omahaValueImpl (board, hand, valuef) {
		if (board.length > 5 || hand.length < 2 || hand.length > 4) {
            throw "omaha value board=" + board + " hand=" + hand;
        }
		if (board.length < 3) {
			return null;
		}
		//for (var n = 0; n < board.length; n++) if (!board[n]) throw "omaha value board card";
		//for (var n = 0; n < hand.length; n++) if (!hand[n]) throw "omaha value hand card";
		// pick 2 from hand, 3 from board
		var a = [];
		var max = 0;
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
							// low value is null if not qualified
							if (v && v > max) {
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
		if (board.length > 5 || hand.length !== 2) {
			throw "hevalue board=" + board + " hand=" + hand;
		}
		if (board.length < 3) {
			return null;
		}
		// pick 0-2 from hand, 3-5 from board
		var a = [];
		var max = 0;
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
							// holdem only played high
							var v = highValue(a);
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
		omahahilo: {
			holdemBoard: true, 
			handMin: 2, 
			handMax: 4, 
			equityFunc: holdemEquity, 
			valueFunc: omahaValue,
			lowValueFunc: omahaLowValue
		},
		highdraw: { 
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
		}
	};

   function deck() {
        return deckArr.slice(0);
    }

    function randomHand () {
        var h = [];
        var d = shuffle(deck());
        for (var n = 0; n < 5; n++) {
            h.push(d[n]);
        }
        return h;
    }

    // exports

    this.randomHand = randomHand;
    this.formatHand = formatHand;
    this.highValue = highValue;
    this.valueDesc = valueDesc;
    this.pairValue = pairValue;
    this.rank = rank;
    this.afLowValue = afLowValue;
    this.dsLowValue = dsLowValue;
}

var eq = new Eq();
var rs = [];
while (rs.length < 9) {
    var h = eq.randomHand();
    var v1 = eq.highValue(h);
    var v2 = eq.afLowValue(h);
    var v3 = eq.dsLowValue(h);
    var r = eq.rank(v1);
    if (rs.indexOf(r) < 0) {
        rs.push(r);
        var v1s = (" " + v1.toString(16)).slice(-6);
        var v3s = (" " + v3.toString(16)).slice(-6);
        var v1d = eq.valueDesc(v1);
        var v3d = eq.valueDesc(v3);
        console.log(eq.formatHand(h) + " hv = " + v1d + " ds = " + v3d);
        if (v1d != v3d) throw "v1d!=v3d";
    }
}
rs.length = 0; // 54, 65, 64, 76, 75, 74, 87, 86, 85, 84
while (rs.length < 10) {
    var h = eq.randomHand();
    var v1 = eq.highValue(h);
    var v2 = eq.afLowValue(h);
    if (v2) {
        var x = v2 & 0xff000;
        if (rs.indexOf(x) < 0) {
            var v1d = eq.valueDesc(v1);
            var v2d = eq.valueDesc(v2);
            console.log(eq.formatHand(h) + " hv = " + v2d + " af = " + v1d);
            rs.push(x);
        }
    }
}
