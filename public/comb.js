/** combinatorial functions (requires big.js) */
(function(){
    
    /** https://github.com/alexyz/pokerjs */
	"use strict";
    
    var BC = [];
    
    /** binomial coefficient (n pick k) */
    function bc (n, k) {
        var a = BC[n] ? BC[n] : (BC[n] = []);
        return a[k] ? a[k] : (a[k] = bc2(n,k));
	}
	
	function bc2 (n,k) {
        if (n >= k && k >= 0) {
            var p = 1;
            for (var i = 1; i <= k; i++) {
                p = p * ((n+1-i)/i);
            }
            return p;
        } else {
            return 0;
        }
    }
    
    /** k combination for n (k=number to pick, n=1 to bc(items,k), a = blank array) */
    function kc (k, n, a) {
		// for each digit (starting at the last)
		for (var k2 = k; k2 >= 1; k2--) {
			// find biggest bin coff that will fit
			for (var n2 = k2 - 1; n2 < 100; n2++) {
				var y = bc(n2, k2);
				if (y > n) {
					// this is too big, so the last one must have fit
					n -= bc(n2 - 1, k2);
                    a[k2-1] = n2-1;
					break;
				}
			}
		}
        if (n != 0) throw "kc n=" + n;
        return a;
	}
    
    window.C = Object.freeze({
        bc: bc,
        kc: kc
    });
    
})();
