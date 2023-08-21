declare module '@/services/apiRevenueTable' {
    import { CustomerService } from '@/servies'
    export { CustomerService }
  }

  declare module '@/services/apiRevenue' {
    import { dataByCategory, dataByPrice, dataByTradeMark } from '@/servies'
    export { dataByCategory, dataByPrice, dataByTradeMark }
  }