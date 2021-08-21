class RequestHelper {

    public isRequiredBodyPresent(req: any, required: any): boolean {
        if (typeof req.body == "undefined")
            return false;

        for (let i = 0; i < required.length; i++) {
            if (typeof req.body[required[i]] == "undefined") return false;
        }
        return true;
    }
    
}

export default new RequestHelper();
