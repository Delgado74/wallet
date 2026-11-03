export interface LnurlNativePlugin {
    owned(options: {
        identity: string;
        arkadeAddress: string;
        boardingAddress?: string;
        baseUrl?: string;
        domain?: string;
        handle?: string;
        refresh?: boolean;
    }): Promise<{
        receiver: any;
    } | {
        error: string;
    }>;
    addresses(options: {
        identity: string;
        arkadeAddress: string;
        boardingAddress?: string;
        baseUrl?: string;
        domain?: string;
    }): Promise<{
        addresses: any[];
    } | {
        error: string;
    }>;
    sessionLnurl(options: {
        identity: string;
        arkadeAddress: string;
        boardingAddress?: string;
        baseUrl?: string;
        domain?: string;
    }): Promise<{
        lnurl: string;
    } | {
        error: string;
    }>;
    capabilities(options: {
        identity: string;
        arkadeAddress: string;
        boardingAddress?: string;
        baseUrl?: string;
        domain?: string;
    }): Promise<{
        capabilities: any;
    } | {
        error: string;
    }>;
}
