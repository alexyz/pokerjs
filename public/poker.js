/** ui functions */
(function () {
	
	/** https://github.com/alexyz/pokerjs */
	"use strict";

	var prevGame;
	
	function getGameId() {
		return $("#game").find(":selected").val();
	}
	
	function getGame () {
		return eq.games[getGameId()];
	}
	
	function gameAction (e, ui) {
		console.log("game selected");
		var id = getGameId();
		var g = getGame();
		
		window.sessionStorage.setItem('game', id);
		
		if (!prevGame || prevGame.type != g.type || prevGame.handMax != g.handMax) {
			// clear hand if game structure is different
			
			$(".deck").removeClass("selected");
			$("#board .handrow").remove();
			var bt = $("#board").get(0);
			if (g.type == 'he') {
				var btr = addHand(bt, 3, 5, true);
			}
			
			$("#hands .handrow").remove();
			$("#hands .handheader").attr("colspan", g.handMax);
			var ht = $("#hands").get(0);
			for (var n = 0; n < 4; n++) {
				addHand(ht, g.handMin, g.handMax, false);
			}
			
			// select first hand cell...
			first();

		} else {
			// just clear eq calc
			clearInfoAction();
		}

		prevGame = g;
	}
	
	/** card dragged from deck to hand */
	function handCardDropped (e, ui) {
		var existingcard = $(this).data("card");
		if (existingcard) {
			// deselect existing card in deck
			$(".deck").filter(cardFilter(existingcard)).removeClass("selected");
		}
		
		var draggedcard = ui.draggable.data("card");
		// clear target card if already used elsewhere
		setCard($(".hand").filter(cardFilter(draggedcard)), null);
		// set card in hand
		setCard($(this), draggedcard);
		// select card in deck
		$(".deck").filter(cardFilter(draggedcard)).addClass("selected");
		// update current
		next($(this));
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
			$(td).click(handTdClicked);
			$(td).dblclick(handTdDoubleClicked);
			$(td).droppable({
				drop: handCardDropped
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
				if (hle && (hle.highsum.outs.indexOf(t.data("card")) >= 0 || (hle.lowsum && hle.lowsum.outs.indexOf(t.data("card")) >= 0))) {
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
	
	function getCards () {
		var hands = { board: [], hands: [], blockers: [] };
		$(".handrow").each(function(i,tr) {
			$(tr).removeClass("error"); // XXX
			var mins = $(tr).data("mins");
			var maxs = $(tr).data("maxs");
			var isboard = $(tr).data("isb");
			var h = [];
			$(tr).find(".hand").each(function(i,e){
				var c = $(e).data("card")
				if (c) {
					h.push(c);
				}
			});
			//console.log("mins=" + mins + " maxs=" + maxs + " isb=" + isb + " h=" + h);
			if (isboard || h.length > 0) {
				// board can be length 0, otherwise must be at least mins
				if ((isboard && h.length === 0) || h.length >= mins) {
					if (hands !== null) {
						if (isboard) {
							hands.board = Object.freeze(h);
						} else {
							hands.hands.push(Object.freeze(h));
						}
					}
				} else {
					$(tr).addClass("error"); // XXX
					hands = null;
				}
			}
		});
		return Object.freeze(hands);
	}
	
	/** filter that selects table cells by card */
	function cardFilter (c) {
		return function () {
			return $(this).data("card") === c;
		};
	}
	
	function deckTdClicked (dtd) {
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
			setCard(handtd, null);
			
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
			setCard(htd, c);
			
			// select next hand card
			next(htd);
		}
	}

	/** select first hand card */
	function first () {
		$(".hand").removeClass("current");
		$("#hands .hand").first().addClass("current");
	}
	
	/** advance current hand card */
	function next (htd) {
		var handtds = $(".hand").removeClass("current");
		var i = handtds.index(htd);
		handtds.eq((i+1)%handtds.length).addClass("current");
	}

	function suitClass (c) {
		switch (c.substring(1,2)) {
			case "c": return "club";
			case "d": return "diamond";
			case "h": return "heart";
			case "s": return "spade";
			default: throw "c=" + c;
		}
	}
	
	/** set or clear card on jquery object */
	function setCard (td, c) {
		if (c) {
			td.removeClass("club heart diamond spade");
			td.addClass(suitClass(c));
			td.html(eq.formatCard(c));
			td.data("card", c);
		} else {
			td.empty();
			td.removeData("card");
		}
	}
	
	function handTdClicked (e) {
		var td = e.currentTarget;
		console.log("handtdclicked " + td.outerHTML);
		// deselect others
		$(".hand").removeClass("current");
		$(td).addClass("current");
	}
	
	function handTdDoubleClicked (e) {
		// update selection
		handTdClicked(e);
		// deselect deck card
		var oc = $(e.currentTarget).data("card");
		if (oc) {
			$(".deck").filter(cardFilter(oc)).removeClass("selected");
		}
		// delete hand card
		setCard($(e.currentTarget), null);
	}
	
	function clearAction () {
		$(".hand").each(function(i,e){
			setCard($(e),null);
		});
		$(".deck").removeClass("selected");
		// select first hand card
		first();
		clearInfoAction();
	}
	
	function clearInfoAction () {
		$(".handrow").removeData("hle");
		$(".value").empty();
		$("#hands").find(".info").each(function(i,e) {
			$(e).empty().removeAttr('title');
		});
		$("#hands").removeData('export');
	}
	
	function randomAction () {
		clearAction();
		var players = eq.randomInt(3) + 2;
		var deck = eq.shuffle(eq.deck());
		var g = getGame();
		if (g.type == 'he') {
			var street = eq.randomInt(4);
			if (street > 0) {
				var board = $("#board").find(".hand");
				for (var n = 0; n < street + 2; n++) {
					var card = deck.pop();
					setCard(board.eq(n), card);
					$(".deck").filter(cardFilter(card)).addClass("selected");
				}
			}
		}
		var handrows = $("#hands .handrow");
		var studlen = eq.randomInt(g.handMax - g.handMin + 1) + g.handMin;
		for (var n = 0; n < players; n++) {
			// pick number of cards in hand according to game
			var handlen;
			switch (g.type) {
				case 'he': handlen = g.handMax; break;
				case 'st': handlen = studlen; break;
				case 'dr': handlen = eq.randomInt(g.handMax - g.handMin + 1) + g.handMin; break;
				default: throw "unknown type " + g.type;
			}
			var handrow = handrows.eq(n).find(".hand");
			for (var n2 = 0; n2 < handlen; n2++) {
				handrow.eq(n2).each(function() {
					var c = deck.pop();
					setCard($(this), c);
					$(".deck").filter(cardFilter(c)).addClass("selected");
				});
			}
		}
	}

	/** format number as percentage to 0 dp */
	function pc (n) {
		return (100*n).toFixed(0)+"%";
	}
	
	function calcAction () {
		console.log("calc action");
		clearInfoAction();
		$(".deck").removeClass("out");

		var cards = getCards();
		console.log("cards=" + JSON.stringify(cards));
		var game = getGame();
		console.log("game=" + JSON.stringify(game));
		var equities = game.equityFunc(cards.board, cards.hands, cards.blockers, game);
		console.log("eqs=" + JSON.stringify(equities));

		$("#hands").data('export', { cards: cards, equities: equities, game: game });
		
		for (var n = 0; n < equities.length; n++) {
			var hle = equities[n];
			var handrow = $(".handrow").filter(rowFilter(hle.hand));
			var h = hle.high;
			var hs = hle.highsum;
			var hh = hle.highhalf;
			var lh = hle.lowhalf;
			var ls = hle.lowsum;
			var t = hle.total();
			
			var title1 = "<table>" +
			"<tr><th/><th>Win</th><th>Tie</th><th>Lose</th><th>Total</th></tr>" +
			"<tr><th>High only</th><td>" + h.win + "</td><td>" + h.tie + "</td><td>" + h.lose() + "</td><td>" + h.count + "</td></tr>";
			if (hh) {
				title1 +=
				"<tr><th>High half</th><td>" + hh.win + "</td><td>" + hh.tie + "</td><td>" + hh.lose() + "</td><td rowspan=2>" + hh.count + "</td></tr>" +
				"<tr><th>Low half</th><td>" + lh.win + "</td><td>" + lh.tie + "</td><td>" + lh.lose() + "</td></tr>" +
				"<tr><th>Total</th><td>" + t.win + "</td><td>" + t.tie + "</td><td>" + t.lose + "</td><td>" + t.count + "</td></tr>"
			}
			title1 += "</table>";
			
			var besteq = (t.wineq+t.tieeq) >= (1/equities.length);
			var v1 = handrow.find(".win");
			v1.html(pc(t.wineq) + (t.tieeq > 0 ? "/" + pc(t.tieeq) : "") + (besteq ? " \u{1F600} " : ""));
			v1.attr('title', title1);
			
			var v2 = handrow.find(".rank");
			var rs = eq.valueDesc(hs.current) + (hs.best ? " \u{1F600} " : "");
			if (ls && ls.count > 0) {
				// really needs to say no low if any low
				// but really eq function should not creates lows if there arn't any
				rs = rs + "<br>" + eq.valueDesc(ls.current) + (ls.best ? " \u{1F600} " : "");
			}
			v2.html(rs);
			
			var t2 = "<table><tr><th>Win/Tie Rank</th><th>Percent</th></tr>";
			for (var k in hs.winranks) {
				var c = h.win+h.tie+(hh?hh.win+hh.tie:0);
				t2 = t2 + "<tr><td>" + eq.rankname(k) + "</td><td>" + ((hs.winranks[k]*100)/c).toFixed(0) + "%</td></tr>";
			}
			t2 = t2 + "</table>";
			v2.attr('title', t2);
			
			var houts = (hs.outs.length > 0) ? "High Outs " + hs.outs.length + "/" + hle.rem : "";
			var louts = ls && (ls.outs.length > 0) ? " Low Outs " + ls.outs.length + "/" + hle.rem : "";
			var exs = hle.exact ? " exact" : " estimated";
			
			var v3 = handrow.find(".value");
			v3.html(houts + louts + exs);
			// if (hs.outs.length + ls.outs.length > 0) {
				// 	v3.attr('title', "high outs = " + hs.outs + "<br>low outs = " + ls.outs);
				// }
				
				// add data for hover
				handrow.data("hle", hle);
			}
		}
		
		function createDeck () {
			var dt = $("#deck").get(0);
			var deck = eq.deck();
			for (var n = 0; n < deck.length; n++) {
				var c = deck[n];
				if (n % 13 === 0) {
					var tr = dt.insertRow(-1);
				}
				var td = tr.insertCell(-1);
				$(td).draggable({ helper: "clone" });
				$(td).click(function(e) {
					deckTdClicked(e.currentTarget);
				});
				
				setCard($(td), c);
				$(td).addClass("deck card");
			}
		}

		function exportAction () {
			var exp = $("#hands").data("export");
			if (exp) {
				var c = exp.cards;
				var e = exp.equities;
				var g = exp.game;
				var o = {};
				o.Game = g.name;
				o.Board = eq.formatCards(c.board);
				for (var n = 0; n < e.length; n++) {
					var t = e[n].total();
					var a = [];
					a.push(eq.formatCards(e[n].hand));
					a.push(pc(t.wineq));
					if (t.tieeq > 0) {
						a.push(pc(t.tieeq));
					}
					o["Hand" + (n+1)] = a;
				}
				window.prompt("Export", JSON.stringify(o,null,1).replace(/[ \n\t]+/g, " "));
			}
		}

		function importAction () {
			var s = window.prompt("Export", "").trim();
			if (s) {
				var o = JSON.parse(s);
				// TODO
				// select game
				// pop boards, cards
			}
		}
		
		/** init ... */
		$(function() {
			$(document).tooltip({
				track: true,
				content: function() { return $(this).attr('title'); }
			});
			
			createDeck();
			
			window.onerror = function(e) {
				alert("error: " + e);
			};
			
			// transform the button elements
			$("button").button();
			$("#random").click(randomAction);
			$("#calc").click(calcAction);
			$("#clear").click(clearAction);
			$("#export").click(exportAction);
			$("#import").click(importAction);
			
			var gid = window.sessionStorage.getItem('game') || 'holdem';
			$("#game").val(gid).selectmenu({
				change: gameAction,
				create: gameAction
			});
			// need to call selectmenu("refresh") to update ui
		});
		
	})();
	