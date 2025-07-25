import { localize } from '@deriv/translations';

import { TInstrumentsIcon, TModifiedTradingPlatformAvailableAccount, TProducts } from '../Components/props.types';

import { CFD_PLATFORMS, JURISDICTION, MARKET_TYPE, MARKET_TYPE_SHORTCODE, PRODUCT, REGION } from './cfd-config';

// Map the accounts according to the market type
const getHighlightedIconLabel = (
    trading_platforms: TModifiedTradingPlatformAvailableAccount,
    selected_region?: string
): TInstrumentsIcon[] => {
    const market_type = getMarketType(trading_platforms);

    const market_type_shortcode =
        trading_platforms.product === PRODUCT.GOLD
            ? market_type.concat('_', trading_platforms.product)
            : market_type.concat('_', trading_platforms.shortcode ?? '');

    const getForexLabel = () => {
        if (selected_region === REGION.EU) {
            return localize('Forex');
        } else if (market_type_shortcode === MARKET_TYPE_SHORTCODE.FINANCIAL_LABUAN) {
            return localize('Forex: standard/exotic');
        } else if (
            market_type_shortcode === MARKET_TYPE_SHORTCODE.FINANCIAL_GOLD ||
            market_type_shortcode === MARKET_TYPE_SHORTCODE.FINANCIAL_SVG ||
            market_type_shortcode === MARKET_TYPE_SHORTCODE.FINANCIAL_BVI ||
            market_type_shortcode === MARKET_TYPE_SHORTCODE.FINANCIAL_VANUATU ||
            market_type_shortcode === MARKET_TYPE_SHORTCODE.FINANCIAL_DML
        ) {
            return localize('Forex');
        } else if (
            (trading_platforms.platform === CFD_PLATFORMS.MT5 &&
                market_type_shortcode === MARKET_TYPE_SHORTCODE.ALL_SWAP_FREE_SVG) ||
            trading_platforms.platform === CFD_PLATFORMS.CTRADER
        ) {
            return localize('Forex: major/minor');
        } else if (
            market_type === MARKET_TYPE.SYNTHETIC ||
            market_type_shortcode === MARKET_TYPE_SHORTCODE.ALL_ZS_BVI
        ) {
            return localize('Forex: standard');
        }
        return localize('Forex: standard/micro');
    };
    const getIdForInstruments = (instruments: TModifiedTradingPlatformAvailableAccount['instruments']) => {
        return instruments?.map(item => {
            if (item.toLowerCase().includes('forex')) {
                return 'forex';
            } else if (item === 'ETFs') {
                return 'ETFs'; // Preserve the original form for ETFs
            }
            return item.toLowerCase().replace(/\s+/g, '_'); // Replace spaces with underscores
        });
    };

    const instrumentsData: TInstrumentsIcon[] = [
        { id: 'forex', icon: 'Forex', text: getForexLabel() },
        { id: 'stocks', icon: 'Stocks', text: localize('Stocks') },
        { id: 'stock_indices', icon: 'StockIndices', text: localize('Stock indices') },
        { id: 'commodities', icon: 'Commodities', text: localize('Commodities') },
        {
            id: 'cryptocurrencies',
            icon: 'Cryptocurrencies',
            text: localize('Cryptocurrencies'),
        },
        { id: 'ETFs', icon: 'ETF', text: localize('ETFs'), is_available: selected_region === REGION.NON_EU },
        {
            id: 'synthetic_indices',
            icon: 'Synthetics',
            text: localize('Synthetic indices'),
        },
        {
            id: 'basket_indices',
            icon: 'Baskets',
            text: localize('Basket indices'),
            is_available: selected_region === REGION.NON_EU,
        },
    ];

    return instrumentsData.map((item: TInstrumentsIcon) => ({
        ...item, // Copy all existing properties
        highlighted: getIdForInstruments(trading_platforms?.instruments)?.includes(item?.id ?? '') ?? true,
    }));
};

// Get the Account Title according to the market type and jurisdiction
const getAccountCardTitle = (shortcode: string, is_demo?: boolean) => {
    switch (shortcode) {
        case MARKET_TYPE_SHORTCODE.SYNTHETIC:
            return is_demo ? localize('Standard demo') : localize('Standard');
        case MARKET_TYPE_SHORTCODE.FINANCIAL:
            return is_demo ? localize('Financial demo') : localize('Financial');
        case MARKET_TYPE_SHORTCODE.FINANCIAL_LABUAN:
            return localize('Financial - STP');
        case MARKET_TYPE_SHORTCODE.FINANCIAL_GOLD:
        case MARKET_TYPE_SHORTCODE.CFDS_GOLD:
            return is_demo ? localize('Gold demo') : localize('Gold');
        case MARKET_TYPE_SHORTCODE.ALL_SWAP_FREE_SVG:
            return is_demo ? localize('Swap-Free demo') : localize('Swap-Free');
        case MARKET_TYPE_SHORTCODE.ALL_ZERO_SPREAD_BVI:
            return is_demo ? localize('Zero Spread demo') : localize('Zero Spread');
        case CFD_PLATFORMS.DXTRADE:
            return is_demo ? localize('Deriv X demo') : localize('Deriv X');
        case CFD_PLATFORMS.CTRADER:
            return is_demo ? localize('Deriv cTrader demo') : localize('Deriv cTrader');
        default:
            return is_demo ? localize('CFDs demo') : localize('CFDs');
    }
};

// Get the Platform label
const getPlatformLabel = (shortcode?: string) => {
    switch (shortcode) {
        case CFD_PLATFORMS.DXTRADE:
            return localize('Deriv X');
        case CFD_PLATFORMS.CFDS:
            return localize('Other CFDs Platform');
        case CFD_PLATFORMS.CTRADER:
            return localize('Deriv cTrader');
        case CFD_PLATFORMS.MT5:
        default:
            return localize('MT5 Platform');
    }
};

// Object to map the platform label
const platformsHeaderLabel = {
    mt5: localize('MT5 Platform'),
    ctrader: localize('Deriv cTrader'),
    derivx: localize('Deriv X'),
    other_cfds: localize('Other CFDs Platform'),
};

// Get the Account Icons based on the market type
const getAccountIcon = (shortcode: string, product?: TProducts) => {
    switch (shortcode) {
        case MARKET_TYPE.SYNTHETIC:
        case MARKET_TYPE.GAMING:
            return 'Standard';
        case MARKET_TYPE.FINANCIAL:
            switch (product) {
                case PRODUCT.GOLD:
                    return 'Gold';
                default:
                    return 'Financial';
            }
        case MARKET_TYPE.ALL:
            switch (product) {
                case PRODUCT.ZEROSPREAD:
                    return 'ZeroSpread';
                case PRODUCT.SWAPFREE:
                default:
                    return 'SwapFree';
            }
        case CFD_PLATFORMS.DXTRADE:
            return 'DerivX';
        case CFD_PLATFORMS.CTRADER:
            return 'CTrader';
        default:
            switch (product) {
                case PRODUCT.GOLD:
                    return 'Gold';
                default:
                    return 'CFDs';
            }
    }
};

// Convert the market type from gaming to synthethics
const getMarketType = (trading_platforms: TModifiedTradingPlatformAvailableAccount) => {
    return trading_platforms.market_type === MARKET_TYPE.GAMING ? MARKET_TYPE.SYNTHETIC : trading_platforms.market_type;
};

// Get the color of Header based on the platform
const getHeaderColor = (shortcode: string) => {
    switch (shortcode) {
        case platformsHeaderLabel.ctrader:
            return 'orange';
        case platformsHeaderLabel.derivx:
            return 'green';
        case platformsHeaderLabel.mt5:
        case platformsHeaderLabel.other_cfds:
        default:
            return 'blue';
    }
};

const getDefaultJurisdictionDetails = (data: TModifiedTradingPlatformAvailableAccount) => {
    const leverage = `${data?.product_details?.max_leverage}`;
    const spread = `${data?.product_details?.min_spread} pips`;

    return {
        leverage,
        leverage_description: localize('Maximum leverage'),
        spread,
        spread_description: localize('Spreads from'),
    };
};

// Config for different Jurisdictions
const cfd_config = () => ({
    leverage: '1:1000',
    leverage_description: localize('Maximum leverage'),
    spread: '0.5 pips',
    spread_description: localize('Spreads from'),
    counterparty_company: 'Deriv (SVG) LLC',
    counterparty_company_description: localize('Counterparty company'),
    jurisdiction: 'St. Vincent & Grenadines',
    jurisdiction_description: localize('Jurisdiction'),
    regulator: localize('Financial Commission'),
    regulator_description: localize('Regulator/External dispute resolution'),
    regulator_license: '',
});

// Map the Jurisdictions with the config
const getJuridisctionDescription = (shortcode: string, trading_platforms: TModifiedTradingPlatformAvailableAccount) => {
    switch (shortcode) {
        case MARKET_TYPE_SHORTCODE.SYNTHETIC:
        case MARKET_TYPE_SHORTCODE.FINANCIAL:
        case MARKET_TYPE_SHORTCODE.FINANCIAL_LABUAN:
        case MARKET_TYPE_SHORTCODE.ALL_ZERO_SPREAD_BVI:
        case MARKET_TYPE_SHORTCODE.ALL_SWAP_FREE_SVG:
        case MARKET_TYPE_SHORTCODE.FINANCIAL_MALTA_INVEST:
            return getDefaultJurisdictionDetails(trading_platforms);
        case MARKET_TYPE_SHORTCODE.ALL_DXTRADE:
        default:
            return cfd_config();
    }
};

// Sort the MT5 accounts in the order of derived, financial and swap-free
const getSortedCFDAvailableAccounts = (available_accounts: TModifiedTradingPlatformAvailableAccount[]) => {
    const swap_free_accounts = available_accounts
        .filter(
            item =>
                item.market_type === MARKET_TYPE.ALL &&
                item.product === PRODUCT.SWAPFREE &&
                item.is_default_jurisdiction === 'true'
        )
        .map(item => ({ ...item, platform: CFD_PLATFORMS.MT5 }) as const);
    const zero_spread_accounts = available_accounts
        .filter(
            item =>
                item.market_type === MARKET_TYPE.ALL &&
                item.product === PRODUCT.ZEROSPREAD &&
                item.is_default_jurisdiction === 'true'
        )
        .map(item => ({ ...item, platform: CFD_PLATFORMS.MT5 }) as const);
    const financial_accounts = available_accounts
        .filter(
            item =>
                item.market_type === MARKET_TYPE.FINANCIAL &&
                item.shortcode !== JURISDICTION.MALTA_INVEST &&
                item.product !== PRODUCT.GOLD &&
                item.is_default_jurisdiction === 'true'
        )
        .map(item => ({ ...item, platform: CFD_PLATFORMS.MT5 }) as const);

    const gold_accounts = available_accounts
        .filter(
            item =>
                item.market_type === MARKET_TYPE.FINANCIAL &&
                item.shortcode !== JURISDICTION.MALTA_INVEST &&
                item.product === PRODUCT.GOLD &&
                item.is_default_jurisdiction === 'true'
        )
        .map(item => ({ ...item, platform: CFD_PLATFORMS.MT5 }) as const);

    const gaming_accounts = available_accounts
        .filter(item => item.market_type === MARKET_TYPE.GAMING && item.is_default_jurisdiction === 'true')
        .map(item => ({ ...item, platform: CFD_PLATFORMS.MT5 }) as const);
    return [
        ...gaming_accounts,
        ...financial_accounts,
        ...swap_free_accounts,
        ...zero_spread_accounts,
        ...gold_accounts,
    ];
};

// Get the maltainvest accounts for EU and DIEL clients
const getEUAvailableAccounts = (available_accounts: TModifiedTradingPlatformAvailableAccount[]) => {
    const financial_accounts = available_accounts
        .filter(
            item =>
                item.shortcode === JURISDICTION.MALTA_INVEST &&
                item.is_default_jurisdiction === 'true' &&
                item.product !== PRODUCT.GOLD
        )
        .map(item => ({ ...item, platform: CFD_PLATFORMS.MT5 }) as const);

    const gold_accounts = available_accounts
        .filter(
            item =>
                item.market_type === MARKET_TYPE.FINANCIAL &&
                item.shortcode === JURISDICTION.MALTA_INVEST &&
                item.is_default_jurisdiction === 'true' &&
                item.product === PRODUCT.GOLD
        )
        .map(item => ({ ...item, platform: CFD_PLATFORMS.MT5 }) as const);

    return [...financial_accounts, ...gold_accounts];
};

// Make the Deriv X data same as trading_platform_available_accounts
const dxtrade_data: TModifiedTradingPlatformAvailableAccount = {
    market_type: MARKET_TYPE.ALL,
    name: 'Deriv X',
    requirements: {
        after_first_deposit: {
            financial_assessment: [''],
        },
        compliance: {
            mt5: [''],
            tax_information: [''],
        },
        signup: [''],
    },
    shortcode: JURISDICTION.SVG,
    sub_account_type: '',
    platform: CFD_PLATFORMS.DXTRADE,
    product: PRODUCT.DERIVX,
};

const ctrader_data: TModifiedTradingPlatformAvailableAccount = {
    market_type: MARKET_TYPE.ALL,
    name: 'cTrader',
    requirements: {
        after_first_deposit: {
            financial_assessment: [''],
        },
        compliance: {
            mt5: [''],
            tax_information: [''],
        },
        signup: [''],
    },
    shortcode: JURISDICTION.SVG,
    sub_account_type: '',
    platform: CFD_PLATFORMS.CTRADER,
    product: 'ctrader',
};

// Get the MT5 demo accounts of the user
const getMT5DemoData = (available_accounts: TModifiedTradingPlatformAvailableAccount[]) => {
    const swap_free_demo_accounts = available_accounts.filter(
        item =>
            item.market_type === MARKET_TYPE.ALL &&
            item.shortcode === JURISDICTION.SVG &&
            item.product === PRODUCT.SWAPFREE &&
            item.platform === CFD_PLATFORMS.MT5
    );
    const zero_spread_demo_accounts = available_accounts.filter(
        item =>
            item.market_type === MARKET_TYPE.ALL &&
            item.shortcode === JURISDICTION.BVI &&
            item.product === PRODUCT.ZEROSPREAD &&
            item.platform === CFD_PLATFORMS.MT5
    );
    const financial_demo_accounts = available_accounts.filter(
        item =>
            item.market_type === MARKET_TYPE.FINANCIAL && item.product !== PRODUCT.STP && item.product !== PRODUCT.GOLD
    );
    const gaming_demo_accounts = available_accounts.filter(item => item.market_type === MARKET_TYPE.GAMING);

    const gold_demo_accounts = available_accounts.filter(
        item => item.market_type === MARKET_TYPE.FINANCIAL && item.product === PRODUCT.GOLD
    );

    return [
        ...gaming_demo_accounts,
        ...financial_demo_accounts,
        ...swap_free_demo_accounts,
        ...zero_spread_demo_accounts,
        ...gold_demo_accounts,
    ];
};
const getDxtradeDemoData = (available_accounts: TModifiedTradingPlatformAvailableAccount[]) => {
    return available_accounts.filter(item => item.platform === CFD_PLATFORMS.DXTRADE);
};

const getCtraderDemoData = (available_accounts: TModifiedTradingPlatformAvailableAccount[]) => {
    return available_accounts.filter(item => item.platform === CFD_PLATFORMS.CTRADER);
};

const generateMarketTypeShortcode = (
    trading_platforms: TModifiedTradingPlatformAvailableAccount,
    market_type: TModifiedTradingPlatformAvailableAccount['market_type'] | 'CFDs'
) => {
    // First check if platform is MT5
    if (trading_platforms.platform !== CFD_PLATFORMS.MT5) {
        return market_type ?? '';
    }

    // Check conditions for generating full shortcode
    const isAllMarketType = market_type === MARKET_TYPE.ALL;
    const isSTPProduct = trading_platforms.product === PRODUCT.STP;
    const isGoldProduct = trading_platforms.product === PRODUCT.GOLD;

    if (isAllMarketType || isSTPProduct) {
        return `${market_type}_${trading_platforms.product}_${trading_platforms.shortcode}`;
    }

    if (isGoldProduct) {
        return `${market_type}_${trading_platforms.product}`;
    }

    return market_type ?? '';
};

export {
    getHighlightedIconLabel,
    getJuridisctionDescription,
    getDefaultJurisdictionDetails,
    getAccountCardTitle,
    getMarketType,
    getAccountIcon,
    getPlatformLabel,
    getSortedCFDAvailableAccounts,
    getEUAvailableAccounts,
    dxtrade_data,
    ctrader_data,
    getHeaderColor,
    platformsHeaderLabel,
    getMT5DemoData,
    getDxtradeDemoData,
    getCtraderDemoData,
    generateMarketTypeShortcode,
};
