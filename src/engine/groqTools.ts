export const groqTools: any[] = [
  {
    type: 'function',
    function: {
      name: 'addTransaction',
      description: 'Log a one-time expense or income',
      parameters: {
        type: 'object',
        properties: { amount: { type: 'number' }, category: { type: 'string' }, type: { type: 'string', enum: ['expense', 'income'] }, date_str: { type: 'string', description: 'YYYY-MM-DD' }, note: { type: 'string' } },
        required: ['amount', 'category', 'type', 'date_str', 'note']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'addRecurring',
      description: 'Add a recurring monthly/weekly income or expense',
      parameters: {
        type: 'object',
        properties: { amount: { type: 'number' }, category: { type: 'string' }, type: { type: 'string', enum: ['expense', 'income'] }, name: { type: 'string' }, day: { type: 'number' }, weekly: { type: 'boolean' } },
        required: ['amount', 'category', 'type', 'name', 'day']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'runWhatIf',
      description: 'Simulate a what-if financial scenario',
      parameters: {
        type: 'object',
        properties: {
          sc: {
            type: 'object',
            properties: { incomeDelta: { type: 'number' }, expenseDelta: { type: 'number' }, oneTime: { type: 'number' }, monthlySave: { type: 'number' }, revenuePct: { type: 'number' }, incomeLoss: { type: 'number' } }
          },
          desc: { type: 'string' }
        },
        required: ['sc', 'desc']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'checkAffordability',
      description: 'Check if the user can afford a one-time or monthly expense',
      parameters: {
        type: 'object',
        properties: { price: { type: 'number' }, item: { type: 'string' }, isMonthly: { type: 'boolean' } },
        required: ['price', 'item']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'whenCanIAfford',
      description: 'Determine when the user can afford a large purchase',
      parameters: {
        type: 'object',
        properties: { price: { type: 'number' }, item: { type: 'string' } },
        required: ['price', 'item']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'projectSavings',
      description: 'Project how much money the user will have by a future date',
      parameters: {
        type: 'object',
        properties: { targetDateYMD: { type: 'string', description: 'YYYY-MM-DD' } },
        required: ['targetDateYMD']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getSpendAllowance',
      description: 'Check how much the user can safely spend over a number of days',
      parameters: {
        type: 'object',
        properties: { days: { type: 'number' } },
        required: ['days']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'explainChanges',
      description: 'Explain changes in spending or profit compared to last month',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'suggestBudget',
      description: 'Suggest a 50/30/20 budget plan based on recent spending',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'planTrip',
      description: 'Plan a trip and calculate costs',
      parameters: {
        type: 'object',
        properties: { destination: { type: 'string' }, days: { type: 'number' }, targetDateYMD: { type: 'string', description: 'YYYY-MM-DD' } },
        required: ['destination', 'days']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'addLoan',
      description: 'Calculate EMI and add a new loan',
      parameters: {
        type: 'object',
        properties: { amount: { type: 'number' }, rate: { type: 'number' }, tenureMonths: { type: 'number' }, type: { type: 'string' } },
        required: ['amount', 'rate', 'tenureMonths', 'type']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'createGoal',
      description: 'Create a savings goal for a specific target amount by a date',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string' }, target: { type: 'number' }, targetDateYMD: { type: 'string', description: 'YYYY-MM-DD' } },
        required: ['name', 'target', 'targetDateYMD']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'transferMoney',
      description: 'Transfer money between personal and business accounts',
      parameters: {
        type: 'object',
        properties: { amount: { type: 'number' }, toPersonal: { type: 'boolean' } },
        required: ['amount', 'toPersonal']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getFinancialContext',
      description: 'Get general financial context to answer arbitrary questions about spending, balances, or trends',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'searchTransactions',
      description: 'Search the user\'s transactions by keyword, category, or type to answer specific questions',
      parameters: {
        type: 'object',
        properties: { keyword: { type: 'string' }, category: { type: 'string' }, type: { type: 'string', enum: ['income', 'expense'] } }
      }
    }
  }
];
