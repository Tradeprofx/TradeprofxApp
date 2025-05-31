import { action, makeObservable, reaction, when } from "mobx"
import type { TApiHelpersStore, TDbotStore } from "src/types/stores.types"
import { ApiHelpers, DBot, runIrreversibleEvents } from "@deriv/bot-skeleton"
import { ContentFlag, isEuResidenceWithOnlyVRTC, routes, showDigitalOptionsUnavailableError } from "@deriv/shared"
import type { TStores } from "@deriv/stores/types"
import { localize } from "@deriv/translations"
import type RootStore from "./root-store"
import { setCurrency } from "@deriv/bot-skeleton/src/scratch/utils"

declare global {
  interface Window {
    __webpack_public_path__: string
    sendRequestsStatistic: any
    Blockly: any
  }
}

export default class AppStore {
  root_store: RootStore
  core: TStores
  dbot_store: TDbotStore | null
  api_helpers_store: TApiHelpersStore | null
  timer: ReturnType<typeof setInterval> | null
  disposeReloadOnLanguageChangeReaction: unknown
  disposeCurrencyReaction: unknown
  disposeSwitchAccountListener: unknown
  disposeLandingCompanyChangeReaction: unknown
  disposeResidenceChangeReaction: unknown
  disposeBalanceListener: unknown

  constructor(root_store: RootStore, core: TStores) {
    makeObservable(this, {
      onMount: action,
      onUnmount: action,
      onBeforeUnload: action,
      registerReloadOnLanguageChange: action,
      registerCurrencyReaction: action,
      registerOnAccountSwitch: action,
      registerLandingCompanyChangeReaction: action,
      registerResidenceChangeReaction: action,
      setDBotEngineStores: action,
      onClickOutsideBlockly: action,
      showDigitalOptionsMaltainvestError: action,
      handleAccountFromUrl: action,
      ensureCorrectAccount: action,
      reinitializeBot: action,
      setUrlParams: action,
      registerBalanceListener: action,
      forceUpdateTradeEngine: action,
      updateBotTradeEngineClient: action,
    })

    this.root_store = root_store
    this.core = core
    this.dbot_store = null
    this.api_helpers_store = null
    this.timer = null
  }

  getErrorForNonEuClients = () => ({
    text: localize(
      "Unfortunately, this trading platform is not available for EU Deriv account. Please switch to a non-EU account to continue trading.",
    ),
    title: localize("Deriv Bot is unavailable for this account"),
    link: localize("Switch to another account"),
  })

  getErrorForEuClients = (is_logged_in = false, country: string | undefined = undefined) => {
    return {
      text: " ",
      title: is_logged_in
        ? localize(`Deriv Bot is not available for ${country || "EU"} clients`)
        : localize(`Deriv Bot is unavailable in ${country || "the EU"}`),
      link: is_logged_in ? localize("Back to Trader's Hub") : "",
      route: routes.traders_hub,
    }
  }

  throwErrorForExceptionCountries = (client_country: string) => {
    const { client, common } = this.core

    const not_allowed_clients_country: { [key: string]: string } = {
      au: "Australian",
      sg: "Singaporean",
    }

    const country_name = not_allowed_clients_country[client_country]

    if (country_name) {
      return showDigitalOptionsUnavailableError(
        common.showError,
        this.getErrorForEuClients(client.is_logged_in, country_name),
      )
    }
  }

  handleErrorForEu = (show_default_error = false) => {
    const { client, common, ui, traders_hub } = this.core
    const toggleAccountsDialog = ui?.toggleAccountsDialog

    if (!client?.is_logged_in && client?.is_eu_country) {
      if (client?.has_logged_out) {
        window.location.href = routes.traders_hub
      }

      this.throwErrorForExceptionCountries(client?.clients_country)
      return showDigitalOptionsUnavailableError(common.showError, this.getErrorForEuClients())
    }

    if (!client.is_landing_company_loaded) {
      return false
    }

    if (window.location.pathname.includes(routes.bot)) {
      this.throwErrorForExceptionCountries(client?.account_settings?.country_code as string)
      if (client.should_show_eu_error) {
        return showDigitalOptionsUnavailableError(common.showError, this.getErrorForEuClients(client.is_logged_in))
      }

      if (traders_hub.content_flag === ContentFlag.HIGH_RISK_CR) {
        return false
      }

      if (traders_hub.content_flag === ContentFlag.LOW_RISK_CR_EU && toggleAccountsDialog) {
        return showDigitalOptionsUnavailableError(
          common.showError,
          this.getErrorForNonEuClients(),
          toggleAccountsDialog,
          false,
          false,
        )
      }

      if (
        ((!client.is_bot_allowed && client.is_eu && client.should_show_eu_error) ||
          isEuResidenceWithOnlyVRTC(client.active_accounts) ||
          client.is_options_blocked) &&
        toggleAccountsDialog
      ) {
        return showDigitalOptionsUnavailableError(
          common.showError,
          this.getErrorForNonEuClients(),
          toggleAccountsDialog,
          false,
          false,
        )
      }
    }

    if (show_default_error && common.has_error) {
      if (common.setError) common.setError(false, { message: "" })
    }
    return false
  }

  // Method to set URL parameters like the official Deriv implementation
  setUrlParams = () => {
    const { client } = this.core
    const url = new URL(window.location.href)
    const loginid = client.loginid
    const account_param = /^VR/.test(loginid) ? "demo" : client.accounts[loginid]?.currency

    if (account_param) {
      url.searchParams.set("account", account_param)
      window.history.replaceState({}, "", url.toString())
    }
  }

  // Method to force update the bot's trade engine with correct client data
  forceUpdateTradeEngine = () => {
    const { client } = this.core

    console.log("Bot: Force updating trade engine with client balance:", client.balance, client.currency)

    // Direct access to bot's trade engine
    if (DBot.interpreter?.bot?.tradeEngine) {
      const engine = DBot.interpreter.bot.tradeEngine

      // Replace the entire client object
      engine.client = client

      // Force update balance if it exists as a property
      if ("balance" in engine) {
        engine.balance = client.balance
      }

      // Update any nested API client
      if (engine.api && engine.api.client) {
        engine.api.client = client
      }

      // Update any account info
      if (engine.accountInfo) {
        engine.accountInfo = {
          ...engine.accountInfo,
          balance: client.balance,
          currency: client.currency,
          loginid: client.loginid,
        }
      }

      // Update any balance cache
      if (engine.balanceCache) {
        engine.balanceCache = client.balance
      }

      // Update any client cache
      if (engine.clientCache) {
        engine.clientCache = client
      }

      console.log("Bot: Trade engine updated. New balance:", engine.client.balance)
      console.log("Bot: Trade engine client loginid:", engine.client.loginid)
    }

    // Also update DBot's global client reference
    if (DBot.client) {
      DBot.client = client
      console.log("Bot: Updated DBot.client with balance:", client.balance)
    }

    // Update any global balance references
    if (window.DBot) {
      window.DBot.client = client
    }
  }

  // Register balance listener like the official implementation
  registerBalanceListener = () => {
    const { client } = this.core

    // Listen for balance updates and ensure bot engine gets updated
    this.disposeBalanceListener = reaction(
      () => client.balance,
      (balance) => {
        console.log("Bot: Balance updated to:", balance, client.currency)

        // Update the dbot_store with fresh balance
        if (this.dbot_store) {
          this.dbot_store.client = client
          console.log("Bot: Updated dbot_store with new balance")
        }

        // Force update the trade engine
        this.forceUpdateTradeEngine()
      },
    )
  }

  // Method to reinitialize the bot after account switching
  reinitializeBot = async () => {
    console.log("Bot: Reinitializing bot engine after account switch")

    // Terminate any existing bot instances
    DBot.terminateBot()

    // Wait for termination to complete
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Reinitialize the interpreter with fresh account data
    DBot.initializeInterpreter()

    // Wait for initialization to complete
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // FORCE UPDATE THE TRADE ENGINE
    this.forceUpdateTradeEngine()

    // Refresh symbols and contracts
    if (ApiHelpers.instance) {
      const { active_symbols, contracts_for } = ApiHelpers.instance
      await active_symbols.retrieveActiveSymbols(true)
      contracts_for.disposeCache()
    }

    // Force refresh of workspace blocks
    if (window.Blockly?.derivWorkspace) {
      window.Blockly.derivWorkspace
        .getAllBlocks()
        .filter((block) => block.type === "trade_definition_market" || block.type === "trade_definition_tradeoptions")
        .forEach((block) => {
          runIrreversibleEvents(() => {
            const fake_create_event = new window.Blockly.Events.BlockCreate(block)
            window.Blockly.Events.fire(fake_create_event)
          })
        })
    }

    console.log("Bot: Reinitialization complete")
  }

  // Enhanced method to handle account switching based on URL parameter
  handleAccountFromUrl = async () => {
    const { client } = this.core

    // For tradeprofxapp.pages.dev, handle account switching from URL
    if (window.location.hostname === "tradeprofxapp.pages.dev") {
      const account_param = new URLSearchParams(window.location.search).get("account")

      if (account_param && client.is_logged_in) {
        console.log("Bot: Account parameter detected:", account_param)
        console.log(
          "Bot: Current account:",
          client.loginid,
          "is_virtual:",
          client.is_virtual,
          "balance:",
          client.balance,
          client.currency,
        )
        console.log("Bot: Available accounts:", Object.keys(client.accounts))

        // Find the appropriate account based on the parameter
        let target_loginid = null

        if (account_param === "demo") {
          // Find demo account
          target_loginid = Object.keys(client.accounts).find((loginid) => client.accounts[loginid].is_virtual)
        } else if (account_param === "real") {
          // Find real account
          target_loginid = Object.keys(client.accounts).find((loginid) => !client.accounts[loginid].is_virtual)
        } else {
          // Find account by currency
          target_loginid = Object.keys(client.accounts).find(
            (loginid) => client.accounts[loginid].currency?.toLowerCase() === account_param.toLowerCase(),
          )
        }

        console.log("Bot: Target account found:", target_loginid)

        // Switch to the target account if found and different from current
        if (target_loginid && target_loginid !== client.loginid) {
          console.log("Bot: Switching to account:", target_loginid)

          // Use the official client.switchAccount method
          await client.switchAccount(target_loginid)

          // Wait for the account switch to complete and balance to update
          await new Promise((resolve) => setTimeout(resolve, 3000))

          console.log(
            "Bot: Account switched. New account:",
            client.loginid,
            "is_virtual:",
            client.is_virtual,
            "balance:",
            client.balance,
            client.currency,
          )

          // Reinitialize the bot after account switch
          await this.reinitializeBot()

          return true
        } else if (target_loginid === client.loginid) {
          console.log("Bot: Already on correct account. Balance:", client.balance, client.currency)

          // Even if we're on the correct account, reinitialize to ensure fresh data
          await this.reinitializeBot()
        }
      }
    }
    return false
  }

  // Method to ensure correct account before trading
  ensureCorrectAccount = async () => {
    const switched = await this.handleAccountFromUrl()
    return switched
  }

  // Method to directly update the bot's trade engine client
  updateBotTradeEngineClient = () => {
    const { client } = this.core

    console.log("Bot: Updating trade engine client directly")

    // Access the bot's trade engine and replace its client
    if (DBot.interpreter?.bot?.tradeEngine) {
      const tradeEngine = DBot.interpreter.bot.tradeEngine

      // Replace the client object entirely
      tradeEngine.client = client

      // If the trade engine has a balance property, update it directly
      if ("balance" in tradeEngine) {
        tradeEngine.balance = client.balance
      }

      // If there's an API object within the trade engine, update it too
      if (tradeEngine.api) {
        tradeEngine.api.client = client
      }

      // Force update any cached balance values
      if (typeof tradeEngine.updateBalance === "function") {
        tradeEngine.updateBalance(client.balance)
      }

      console.log("Bot: Trade engine client updated with balance:", client.balance, client.currency)
      console.log("Bot: Trade engine now has client:", !!tradeEngine.client)
    }

    // Also update the DBot's main client reference
    if (DBot.client) {
      DBot.client = client
      console.log("Bot: Updated DBot.client with balance:", client.balance)
    }
  }

  onMount = () => {
    const { blockly_store, run_panel } = this.root_store
    const { client, ui, traders_hub } = this.core
    const { is_dark_mode_on } = ui
    this.showDigitalOptionsMaltainvestError()

    let timer_counter = 1

    this.timer = setInterval(() => {
      if (window.sendRequestsStatistic) {
        window.sendRequestsStatistic(false)
        performance.clearMeasures()
        if (timer_counter === 6 || run_panel?.is_running) {
          if (this.timer) clearInterval(this.timer)
        } else {
          timer_counter++
        }
      }
    }, 10000)

    blockly_store.setLoading(true)
    DBot.initWorkspace(
      window.__webpack_public_path__,
      this.dbot_store,
      this.api_helpers_store,
      ui.is_mobile,
      is_dark_mode_on,
    ).then(() => {
      blockly_store.setContainerSize()
      blockly_store.setLoading(false)

      // Handle account switching from URL after workspace is initialized
      this.handleAccountFromUrl()
    })

    this.registerReloadOnLanguageChange()
    this.registerCurrencyReaction.call(this)
    this.registerOnAccountSwitch.call(this)
    this.registerLandingCompanyChangeReaction.call(this)
    this.registerResidenceChangeReaction.call(this)
    this.registerBalanceListener() // Register balance listener

    window.addEventListener("click", this.onClickOutsideBlockly)
    window.addEventListener("beforeunload", this.onBeforeUnload)

    blockly_store.getCachedActiveTab()

    when(
      () => client?.should_show_eu_error || client?.is_landing_company_loaded,
      () => this.showDigitalOptionsMaltainvestError(),
    )

    reaction(
      () => traders_hub?.content_flag,
      () => this.showDigitalOptionsMaltainvestError(),
    )
  }

  onUnmount = () => {
    DBot.terminateBot()
    DBot.terminateConnection()
    if (window.Blockly.derivWorkspace) {
      clearInterval(window.Blockly.derivWorkspace.save_workspace_interval)
      window.Blockly.derivWorkspace.dispose()
    }
    if (typeof this.disposeReloadOnLanguageChangeReaction === "function") {
      this.disposeReloadOnLanguageChangeReaction()
    }
    if (typeof this.disposeCurrencyReaction === "function") {
      this.disposeCurrencyReaction()
    }
    if (typeof this.disposeSwitchAccountListener === "function") {
      this.disposeSwitchAccountListener()
    }
    if (typeof this.disposeLandingCompanyChangeReaction === "function") {
      this.disposeLandingCompanyChangeReaction()
    }
    if (typeof this.disposeResidenceChangeReaction === "function") {
      this.disposeResidenceChangeReaction()
    }
    if (typeof this.disposeBalanceListener === "function") {
      this.disposeBalanceListener()
    }

    window.removeEventListener("click", this.onClickOutsideBlockly)
    window.removeEventListener("beforeunload", this.onBeforeUnload)

    // Ensure account switch is re-enabled.
    const { ui } = this.core

    ui.setAccountSwitcherDisabledMessage()
    ui.setPromptHandler(false)

    if (this.timer) clearInterval(this.timer)
    performance.clearMeasures()
  }

  onBeforeUnload = (event: Event) => {
    const { is_stop_button_visible } = this.root_store.run_panel

    if (is_stop_button_visible) {
      event.returnValue = true
    }
  }

  registerReloadOnLanguageChange = () => {
    this.disposeReloadOnLanguageChangeReaction = reaction(
      () => this.core.common.current_language,
      () => {
        // temporarily added this to refresh just dbot in case of changing language,
        // otherwise it should change language without refresh.
        const { pathname } = window.location
        const is_bot = /^\/bot/.test(pathname) || (/^\/(br_)/.test(pathname) && pathname.split("/")[2] === "bot")
        if (is_bot) window.location.reload()
      },
    )
  }

  registerCurrencyReaction = () => {
    // Syncs all trade options blocks' currency with the client's active currency.
    this.disposeCurrencyReaction = reaction(
      () => this.core.client.currency,
      () => {
        if (!window.Blockly.derivWorkspace) return

        const trade_options_blocks = window.Blockly.derivWorkspace
          .getAllBlocks()
          .filter(
            (b) =>
              b.type === "trade_definition_tradeoptions" ||
              b.type === "trade_definition_multiplier" ||
              b.type === "trade_definition_accumulator" ||
              (b.isDescendantOf("trade_definition_multiplier") && b.category_ === "trade_parameters"),
          )

        trade_options_blocks.forEach((trade_options_block) => setCurrency(trade_options_block))
      },
    )
  }

  registerOnAccountSwitch = () => {
    const { client } = this.core

    this.disposeSwitchAccountListener = reaction(
      () => client.switch_broadcast,
      (switch_broadcast) => {
        if (!switch_broadcast) return
        this.showDigitalOptionsMaltainvestError()

        console.log("Bot: Account switch broadcast received")

        if (ApiHelpers.instance) {
          const { active_symbols, contracts_for } = ApiHelpers.instance

          if (window.Blockly.derivWorkspace) {
            active_symbols.retrieveActiveSymbols(true).then(() => {
              contracts_for.disposeCache()
              window.Blockly.derivWorkspace
                .getAllBlocks()
                .filter((block) => block.type === "trade_definition_market")
                .forEach((block) => {
                  runIrreversibleEvents(() => {
                    const fake_create_event = new window.Blockly.Events.BlockCreate(block)
                    window.Blockly.Events.fire(fake_create_event)
                  })
                })
            })
          }
          DBot.initializeInterpreter()
        }

        // Update URL params after account switch
        this.setUrlParams()

        // Force update trade engine after account switch
        setTimeout(() => {
          this.forceUpdateTradeEngine()
        }, 1000)

        // Re-check account from URL after account switch
        setTimeout(async () => {
          await this.handleAccountFromUrl()
        }, 100)
      },
    )
  }

  registerLandingCompanyChangeReaction = () => {
    const { client } = this.core

    this.disposeLandingCompanyChangeReaction = reaction(
      () => client.landing_company_shortcode,
      () => this.handleErrorForEu(),
    )
  }

  registerResidenceChangeReaction = () => {
    const { client } = this.core

    this.disposeResidenceChangeReaction = reaction(
      () => client.account_settings.country_code,
      () => this.handleErrorForEu(),
    )
  }

  setDBotEngineStores = () => {
    // DO NOT pass the rootstore in, if you need a prop define it in dbot-skeleton-store and pass it through.
    const { flyout, toolbar, save_modal, dashboard, load_modal, run_panel, blockly_store, summary_card } =
      this.root_store
    const { client } = this.core
    const { handleFileChange } = load_modal
    const { setLoading } = blockly_store
    const { setContractUpdateConfig } = summary_card
    const {
      ui: { is_mobile },
    } = this.core

    this.dbot_store = {
      client,
      flyout,
      toolbar,
      save_modal,
      dashboard,
      load_modal,
      run_panel,
      setLoading,
      setContractUpdateConfig,
      handleFileChange,
      is_mobile,
    }

    this.api_helpers_store = {
      server_time: this.core.common.server_time,
      ws: this.root_store.ws,
    }
  }

  onClickOutsideBlockly = (event: Event) => {
    if (document.querySelector(".injectionDiv")) {
      const path = event.path || (event.composedPath && event.composedPath())
      const is_click_outside_blockly = !path.some(
        (el: Element) => el.classList && el.classList.contains("injectionDiv"),
      )

      if (is_click_outside_blockly) {
        window.Blockly?.hideChaff(/* allowToolbox */ false)
      }
    }
  }

  showDigitalOptionsMaltainvestError = () => {
    this.handleErrorForEu(true)
  }
}
