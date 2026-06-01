(function () {
    const STORAGE_KEY = "ss_coupon_v1";

    const coupons = [
        {
            code: "SAVE10",
            label: "10% off",
            detail: "10% off orders above Rs.499",
            minSubtotal: 499,
            type: "percent",
            value: 10,
            maxDiscount: 500,
        },
        {
            code: "FIRST30",
            label: "30% off",
            detail: "30% off first premium checkout above Rs.999",
            minSubtotal: 999,
            type: "percent",
            value: 30,
            maxDiscount: 1000,
        },
        {
            code: "FLAT200",
            label: "Rs.200 off",
            detail: "Rs.200 off orders above Rs.1499",
            minSubtotal: 1499,
            type: "flat",
            value: 200,
            maxDiscount: 200,
        },
        {
            code: "TOYS15",
            label: "15% off",
            detail: "15% off kids and weekend picks above Rs.299",
            minSubtotal: 299,
            type: "percent",
            value: 15,
            maxDiscount: 350,
        },
    ];

    const normalizeCode = (code) => String(code || "").trim().toUpperCase().replace(/\s+/g, "");

    const findCoupon = (code) => {
        const normalized = normalizeCode(code);
        return coupons.find((coupon) => coupon.code === normalized) || null;
    };

    const formatPrice = (value) => {
        const number = Number(value);
        if (!Number.isFinite(number)) return "Rs.0";
        return number.toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        });
    };

    const readAppliedCoupon = () => {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            const code = normalizeCode(parsed?.code);
            return code ? { code } : null;
        } catch {
            return null;
        }
    };

    const saveAppliedCoupon = (code) => {
        const coupon = findCoupon(code);
        if (!coupon) return null;
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ code: coupon.code, savedAt: Date.now() }));
        window.dispatchEvent(new CustomEvent("shopsmart:coupon-change", { detail: { code: coupon.code } }));
        return coupon;
    };

    const clearAppliedCoupon = () => {
        window.localStorage.removeItem(STORAGE_KEY);
        window.dispatchEvent(new CustomEvent("shopsmart:coupon-change", { detail: { code: null } }));
    };

    const calculateRawDiscount = (coupon, subtotal) => {
        const amount = Number(subtotal);
        if (!coupon || !Number.isFinite(amount) || amount <= 0) return 0;

        const raw = coupon.type === "flat" ? coupon.value : amount * (coupon.value / 100);
        return Math.max(0, Math.min(Math.round(raw), coupon.maxDiscount || raw, amount));
    };

    const validateCoupon = (code, subtotal) => {
        const coupon = findCoupon(code);
        const amount = Number(subtotal);

        if (!normalizeCode(code)) {
            return { ok: false, coupon: null, discount: 0, message: "Enter a coupon code." };
        }

        if (!coupon) {
            return { ok: false, coupon: null, discount: 0, message: "This coupon code is not available." };
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            return { ok: false, coupon, discount: 0, message: "Add products to your cart to use this coupon." };
        }

        if (amount < coupon.minSubtotal) {
            const remaining = coupon.minSubtotal - amount;
            return {
                ok: false,
                coupon,
                discount: 0,
                message: `Add ${formatPrice(remaining)} more to unlock ${coupon.code}.`,
            };
        }

        const discount = calculateRawDiscount(coupon, amount);
        return {
            ok: true,
            coupon,
            discount,
            message: `${coupon.code} applied. You saved ${formatPrice(discount)}.`,
        };
    };

    const calculateDiscount = (subtotal, code) => {
        const selectedCode = normalizeCode(code || readAppliedCoupon()?.code);
        if (!selectedCode) {
            return { valid: false, coupon: null, code: "", discount: 0, message: "" };
        }

        const result = validateCoupon(selectedCode, subtotal);
        return {
            valid: result.ok,
            coupon: result.coupon,
            code: result.coupon?.code || selectedCode,
            discount: result.ok ? result.discount : 0,
            message: result.message,
        };
    };

    window.ShopSmartCoupons = {
        coupons,
        normalizeCode,
        findCoupon,
        getAppliedCoupon: readAppliedCoupon,
        saveAppliedCoupon,
        clearAppliedCoupon,
        validateCoupon,
        calculateDiscount,
    };
})();
