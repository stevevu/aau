import axios from 'axios';
import { config } from '../config';
import { GlobalStateContainer } from './GlobalStateContainer';
import { createContainer } from 'unstated-next';
import jwt from 'jsonwebtoken';

export enum BackendEndpoint {
  // authentication
  Login = '/api/login',
  SignUpCustomer = '/api/signup/customer',
  SignUpRecipient = '/api/signup/recipient',
  SignUpDiner = '/api/signup/diner',
  SignUpRestaurant = '/api/signup/restaurant',

  // customer
  GetCustomer = '/api/customer',
  UpdatePassword = '/api/customer/password',
  ConfirmOTP = '/api/customer/password/otp',
  ResetPassword = '/api/customer/password/reset',
  VerifyOTP = '/api/customer/password/otp',

  // recipient
  GetRecipientApprovalStatus = '/api/recipient/approval',
  GetRecipientAvailableCredits = '/api/recipient/credits',
  GetRecipientOrders = '/api/recipient/orders',
  RecipientResponse = '/api/recipient/responses',
  UploadRecipientId = '/api/recipient/upload-id',

  // restaurant
  GetRestaurants = '/api/restaurant',
  GetRestaurantId = '/api/restaurant/id',

  // menu
  AddMenuItem = '/api/menu/add',
  UpdateMenuItem = '/api/menu/update',
  DeleteMenuItem = '/api/menu/delete',

  // metric
  GetMetrics = '/api/metric',

  // image upload
  UploadItemImage = '/api/upload_image_url',

  // payment
  SendSquarePayment = '/api/payment',

  // admin
  GetRecipients = '/api/admin/recipients',
  EditRecipient = '/api/admin/edit-recipient',
  ApproveRecipient = '/api/admin/recipient-approval',
  GetAdminLogs = '/api/admin/log'
}

export enum LoadingStages {
  NotAttempted = 'Not Attempted Yet',
  Loading = 'Loading',
  LoadFailed = 'Failed',
  LoadSucceeded = 'Success',
}

export enum RequestType {
  GET,
  POST,
  PUT,
  DELETE
}

export enum ContentType {
  JSON = 'application/json',
  FORM = 'multipart/form-data'
}

export enum UploadImageType {
  Item,
  Id
}

const contactOpenMeal = 'Ooops, we are expecting technical difficulties. Please contact hello@openmeal.org.';
const unknownResponse = { "error": "unknown error calling API", "errorMessage": contactOpenMeal };

interface Request {
  needsAuthentication: boolean,
  endpoint: BackendEndpoint | string,
  requestType: RequestType,
  contentType?: ContentType,
  data: object,
  setResponseState: (response: object) => void,
  setLoadingState: (isLoading: LoadingStages) => void,
}

function useRemoteCallContainer() {
  const container = GlobalStateContainer.useContainer();
  const { cookie } = container;

  const performRemoteCall = async (request: Request) => {
    await request.setLoadingState(LoadingStages.Loading);
    let response;
    try {
      const contentType = request.contentType !== undefined ? request.contentType : ContentType.JSON;
      const header = request.needsAuthentication ? {
        headers: {
          'Content-Type': contentType,
          AUTH_TOKEN: cookie.accessToken
        }
      } : {
        headers: {
          'Content-Type': contentType
        }
      };

      if (request.requestType === RequestType.GET) {
        response = await axios.get(config.API_URL + request.endpoint, {
          headers: header
        });
      } else if (request.requestType === RequestType.POST) {
        response = await axios.post(config.API_URL + request.endpoint, request.data, {
          headers: header
        });
      } else if (request.requestType === RequestType.PUT) {
        response = await axios.put(config.API_URL + request.endpoint, request.data, {
          headers: header
        });
      } else if (request.requestType === RequestType.DELETE) {
        response = await axios.delete(config.API_URL + request.endpoint, {
          headers: header
        });
      }

      if (response !== undefined && (response.status === 200 || response.status === 201)) {
        await request.setResponseState(response.data);
        await request.setLoadingState(LoadingStages.LoadSucceeded);
      } else {
        await request.setResponseState(response.data);
        await request.setLoadingState(LoadingStages.LoadFailed);
      }
    } catch (err) {
      console.log(err);
      if (response !== undefined && response.status !== 200 && response.status !== 201) {
        await request.setResponseState(response.data);
        await request.setLoadingState(LoadingStages.LoadFailed);
      }
    } finally {
      if (response !== undefined) {
        console.log('Response Status:', response.status);
      }
    }
  };

  /*
  * authentication endpoint funcs below:
  */
  const userLogin = async (email, password, setResponseState, setLoadingState) => {
    try {
      const response = await axios.post(config.API_URL + BackendEndpoint.Login, {
        email: email,
        password: password
      }, {
        headers: {
          'Content-Type': ContentType.JSON,
        }
      });
      if (response !== undefined && (response.status === 200 || response.status === 201)) {
        await setResponseState(response.data);
        await setLoadingState(LoadingStages.LoadSucceeded);
      } else {
        await setResponseState(response.data);
        await setLoadingState(LoadingStages.LoadFailed);
      }
    } catch (e) {
      if (e.response.data) {
        await setResponseState(e.response.data);
        await setLoadingState(LoadingStages.LoadFailed);
      }
      console.log(e);
    }
  };

  const signUpCustomer = async (data, setResponseState, setLoadingState) => {
    try {
      const response = await axios.post(config.API_URL + BackendEndpoint.SignUpCustomer, {
        name: data.name,
        email: data.email,
        phone: data.phone
      }, {
        headers: {
          'Content-Type': ContentType.JSON,
        }
      });
      if (response !== undefined && (response.status === 200 || response.status === 201)) {
        await setResponseState(response.data);
        await setLoadingState(LoadingStages.LoadSucceeded);
      } else {
        await setResponseState(response.data);
        await setLoadingState(LoadingStages.LoadFailed);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const signUpRecipient = async (data, setResponseState, setLoadingState) => {
    try {
      const response = await axios.post(config.API_URL + BackendEndpoint.SignUpRecipient, {
        otp: data.otp,
        email: data.email
      }, {
        headers: {
          'Content-Type': ContentType.JSON,
        }
      });
      if (response !== undefined && (response.status === 200 || response.status === 201)) {
        await setResponseState(response.data);
        await setLoadingState(LoadingStages.LoadSucceeded);

        const inTwoHours = new Date(new Date().getTime() + 120 * 60 * 1000);
        const decoded = jwt.decode(response.data.token.substring('Bearer '.length), { complete: true });
        if (decoded) {
          container.setEmail(((decoded as any).payload.identity as any)[0]);
          container.setUserType(((decoded as any).payload.identity as any)[1]);
        }
        container.setCookie('accessToken', response.data.token, { expires: inTwoHours });
        container.setLoggedIn(true);
      } else {
        await setResponseState(response.data);
        await setLoadingState(LoadingStages.LoadFailed);
      }
    } catch (e) {
      // for axios, can access Promise's reject via `error.response.data` (https://stackoverflow.com/a/60869154)
      if (e.response.data) {
        console.log('ERROR: confirming one-time password:', e.response.data);
        await setResponseState(e.response.data);
        await setLoadingState(LoadingStages.LoadFailed);
      } else {
        console.log('ERROR: confirming one-time password, no data in response:', e, e.response);
        setResponseState({'errorMessage': 'Throwing an error on line 232'});
        // setResponseState({"errorMessage": contactOpenMeal});
        await setLoadingState(LoadingStages.LoadFailed);
      }
    }
  };

  const signUpDiner = async (data, setResponseState) => {
    try {
      const response = await axios.post(config.API_URL + BackendEndpoint.SignUpDiner, data, {
        headers: {
          'Content-Type': ContentType.JSON,
        }
      });
      if (response !== undefined && (response.status === 200 || response.status === 201)) {
        await setResponseState(response.data);
        return response.data;
      } else {
        if (response !== undefined && response.data) {
          await setResponseState(response.data);
          return response.data;
        }
        else {
          setResponseState(unknownResponse);
          return unknownResponse;
        }
      }
    } catch (e) {
      if (e.response && e.response.data) {
        await setResponseState(e.response.data);
        return e.response.data;
      } else {
        // eg, network timeout, backend endpoint not defined
        setResponseState(unknownResponse);
        return unknownResponse;
      }
    }
  };

  const signUpRestaurant = async (data) => {
    try {
      const response = await axios.post(config.API_URL + BackendEndpoint.SignUpRestaurant, data, {
        headers: {
          'Content-Type': ContentType.JSON,
        }
      });
      if (response !== undefined && (response.status === 200 || response.status === 201)) {
        return response.data;
      }
      
    } catch (e) {
      return e.response.data;
    }
  };

  /*
   * customer endpoint funcs below:
   */
  const getCustomer = async () => {
    try {
      const response = await axios.get(config.API_URL + BackendEndpoint.GetCustomer, {
        headers: {
          AUTH_TOKEN: cookie.accessToken,
          'Content-Type': ContentType.JSON
        }
      });
      if (response.status === 200) {
        container.setCustomerData(response.data);
      }
      return response.status === 200;
    } catch (e) {
      console.log(e);
      return false;
    }
  };

  const updatePassword = async (oldPass, newPass, confirmNewPass) => {
    try {
      const response = await axios.post(config.API_URL + BackendEndpoint.UpdatePassword, {
        oldPassword: oldPass,
        newPassword: newPass,
        confirmNewPassword: confirmNewPass
      }, {
        headers: {
          AUTH_TOKEN: cookie.accessToken,
          'Content-Type': ContentType.JSON
        }
      });
      return response.status === 200;
    } catch (e) {
      console.log(e);
      return false;
    }
  };

  const resetPassword = async (email) => {
    try {
      const response = await axios.post(config.API_URL + BackendEndpoint.ResetPassword, {
        email: email
      }, {
        headers: {
          'Content-Type': ContentType.JSON
        }
      });
      return response.status === 200;
    } catch (e) {
      console.log(e);
      return false;
    }
  };

  const verifyOTP = async (data, setLoadingState) => {
    try {
      const response = await axios.post(config.API_URL + BackendEndpoint.VerifyOTP, {
        otp: data.otp,
        email: data.email
      }, {
        headers: {
          'Content-Type': ContentType.JSON,
        }
      });
      response.status = 201;
      if (response === undefined || (response.status !== 200 && response.status !== 201)) {
        console.error(response);
        throw new Error('Bad response 1');
      }
      const inTwoHours = new Date(new Date().getTime() + 120 * 60 * 1000);
      const decoded = jwt.decode(response.data.token.substring('Bearer '.length), { complete: true });
      
      if (!decoded) {
        throw new Error('Bad response 2');
      }
      container.setEmail(((decoded as any).payload.identity as any)[0]);
      container.setUserType(((decoded as any).payload.identity as any)[1]);
        
      container.setCookie('accessToken', response.data.token, { expires: inTwoHours });
      container.setLoggedIn(true);
      await setLoadingState(LoadingStages.LoadSucceeded);
    } catch (e) {
      console.log(e);
      await setLoadingState(LoadingStages.LoadFailed);

    }
  };

  const confirmOTP = async (otp, sendHasAuth) => {
    // return sendHasAuth(true);
    await axios.post(config.API_URL + BackendEndpoint.ConfirmOTP)
      .then(function (response) {
        console.log('SUCCES', response);
        sendHasAuth(true);
      })
      .catch(function (error) {
        console.log('ERROR', error);
      });
  };

  /*
   * recipient endpoint funcs below:
   */
  const getRecipientApprovalStatus = async () => {
    try {
      const response = await axios.get(config.API_URL + BackendEndpoint.GetRecipientApprovalStatus, {
        headers: {
          AUTH_TOKEN: cookie.accessToken,
          'Content-Type': ContentType.JSON,
        }
      });
      if (response.status === 200) {
        container.setRecipientApprovalStatus(response.data.status);
      }
      return response.status === 200;
    }
    catch (e) {
      console.log(e);
      return false;
    }
  };

  const getRecipientAvailableCredits = async () => {
    try {
      const response = await axios.get(config.API_URL + BackendEndpoint.GetRecipientAvailableCredits, {
        headers: {
          AUTH_TOKEN: cookie.accessToken,
          'Content-Type': ContentType.JSON,
        }
      });
      if (response.status === 200) {
        container.setAvailableCredits(response.data.available_credits);
        container.setAvailableExtraCredits(response.data.extra_credits);
      }
      return response.status === 200;
    }
    catch (e) {
      console.log(e);
      return false;
    }
  };

  const getRecipientOrders = async (setResponseState) => {
    try {
      const response = await axios.get(config.API_URL + BackendEndpoint.GetRecipientOrders, {
        headers: {
          AUTH_TOKEN: cookie.accessToken,
          'Content-Type': ContentType.JSON,
        }
      });
      if (response.status === 200) {
        container.setOrderHistory(JSON.parse(response.data.order_history));
        setResponseState(JSON.parse(response.data.order_history));
      }
    } catch (e) {
      console.log(e);
    }
  };

  const getRecipientResponses = async () => {
    try {
      const response = await axios.get(config.API_URL + BackendEndpoint.RecipientResponse, {
        headers: {
          AUTH_TOKEN: cookie.accessToken,
          'Content-Type': ContentType.JSON,
        }
      });
      if (response.status === 200) {
        container.setRecipientResponses(response.data);
      }
      return response.status === 200;
    }
    catch (e) {
      console.log(e);
      return false;
    }
  };

  interface ResponseText {
    status: string;
    resp1: string;
    resp2: string;
    resp3: string;
  }

  const submitRecipientResponse = async (responseText: ResponseText) => {
    try {
      const response = await axios.post(config.API_URL + BackendEndpoint.RecipientResponse, {
        responses: responseText
      }, {
        headers: {
          AUTH_TOKEN: cookie.accessToken,
          'Content-Type': ContentType.JSON,
        }
      });
      return response.status === 200;
    } catch (e) {
      console.log(e);
      return false;
    }
  };

  /*
   * restaurant endpoint funcs below:
   */
  const getRestaurants = async () => {
    container.setRetrievingRestaurants(true);
    try {
      const response = await axios.get(config.API_URL + BackendEndpoint.GetRestaurants);
      if (response.status === 200) {
        container.setRestaurantList(response.data.restaurants);
      }
      container.setRetrievingRestaurants(false);
      return response.status === 200;
    } catch (e) {
      console.log(e);
      container.setRetrievingRestaurants(false);
      return false;
    }
  };

  const getRestaurantData = async (id, setResponseState, setLoadingState) => {
    try {
      const response = await axios.get(config.API_URL + BackendEndpoint.GetRestaurants + `/${id}`, {
        headers: {
          AUTH_TOKEN: cookie.accessToken,
          'Content-Type': ContentType.JSON,
        }
      });
      if (response !== undefined && (response.status === 200 || response.status === 201)) {
        await setResponseState(response.data);
        await setLoadingState(LoadingStages.LoadSucceeded);
      } else {
        await setResponseState(response.data);
        await setLoadingState(LoadingStages.LoadFailed);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const cancelOrder = async (orderId) => {
    try {
      const response = await axios.delete(config.API_URL + BackendEndpoint.GetRestaurants + `/cancel/${orderId}`, {
        headers: {
          AUTH_TOKEN: cookie.accessToken,
          'Content-Type': ContentType.JSON,
        }
      });
      if (response !== undefined && response.status === 200) {
        container.setAvailableCredits(response.data.recipient_credit);
        return true;
      }
      else {
        return false;
      }
    }
    catch (e) {
      console.log('ERROR: cancelling order:', e);
    }
  };

  const createOrder = async (restaurantId) => {
    try {
      const response = await axios.post(config.API_URL + BackendEndpoint.GetRestaurants + `/${restaurantId}/order`, {
        amount: container.orderTotal,
        meal_items: container.order,
        pickupTime: container.pickupTime,
        useExtraCredit: container.redeemExtraCredits
      }, {
        headers: {
          AUTH_TOKEN: cookie.accessToken,
          'Content-Type': ContentType.JSON,
        }
      });
      if (response.status === 200) {
        // @TODO: should move these to local state of OrderFeed by sending callback
        container.setPickupCode(response.data.pickupCode);
        container.setAvailableCredits(response.data.availableCredits);
        container.setExtraCreditsUsed(response.data.extraCreditsUsed);
        container.setAvailableExtraCredits(response.data.extraCreditsRemaining);
        container.setRedeemExtraCredits(false); // reset to False, since thats default value of checkbox
        container.setOrderPlaced(true);
        container.setOrder([]);
        container.setPickupTime({ text: '', timestamp: null });
        container.setOrderCreateDate(response.data.createDate);
        container.setOrderId(response.data.orderId);
      }
      return response.status === 200;
    } catch (e) {
      console.log(e);
      return false;
    }
  };

  const completeOrder = async (restaurantId, orderId, pickupCode) => {
    try {
      const response = await axios.post(
        config.API_URL + BackendEndpoint.GetRestaurants + `/${restaurantId}/order/${orderId}`, {
          pickup_code: pickupCode
        }, {
          headers: {
            AUTH_TOKEN: cookie.accessToken,
            'Content-Type': ContentType.JSON,
          }
        }
      );
      if (response !== undefined && response.status === 200) {
        container.setVerifiedCode(true);
      }
      return response.status === 200;
    } catch (e) {
      console.log(e);
      return false;
    }
  };

  const getRestaurantOrders = async (isInactiveOrders, id, setResponseState, setLoadingState) => {
    try {
      const response = await axios.get(config.API_URL + BackendEndpoint.GetRestaurants + `/${id}` + (isInactiveOrders ? '/inactive' : '/active'), {
        headers: {
          AUTH_TOKEN: cookie.accessToken,
          'Content-Type': ContentType.JSON,
        }
      });
      if (response !== undefined && (response.status === 200 || response.status === 201)) {
        await setResponseState(response.data);
        await setLoadingState(LoadingStages.LoadSucceeded);
      } else {
        await setResponseState(response.data);
        await setLoadingState(LoadingStages.LoadFailed);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const getRestaurantId = async () => {
    try {
      const response = await axios.get(config.API_URL + BackendEndpoint.GetRestaurantId, {
        headers: {
          AUTH_TOKEN: cookie.accessToken,
          'Content-Type': ContentType.JSON
        }
      });
      if (response.status === 200) {
        container.setCurrentRestaurantId(response.data.restaurant_id);
        return response.data.restaurant_id;
      }
    } catch (e) {
      console.log(e);
      return undefined;
    }
  };

  /*
   * menu endpoint funcs below:
   */
  const getMenuItems = async () => {
    container.setLoadingMenu(true);
    try {
      const response = await axios.get(config.API_URL + `/api/menu/${container.currentRestaurantId}`, {
        headers: {
          AUTH_TOKEN: cookie.accessToken,
          'Content-Type': ContentType.JSON
        }
      });
      if (response !== undefined && response.status === 200) {
        container.setMenu(JSON.parse(response.data.items));
        container.setLoadingMenu(false);
      } else {
        container.setMenu([]);
        container.setLoadingMenu(false);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const addMenuItem = async (itemName, itemDescription, itemCategory, itemPrice, imageUrl) => {
    try {
      const response = await axios.post(config.API_URL + BackendEndpoint.AddMenuItem, {
        menu_item: {
          name: itemName,
          description: itemDescription,
          imageUrl: imageUrl,
          baseCost: itemPrice,
          category: itemCategory,
        }
      }, {
        headers: {
          AUTH_TOKEN: cookie.accessToken,
          'Content-Type': ContentType.JSON
        }
      });
      return response.status === 200;
    } catch (e) {
      console.log(e);
      return false;
    }
  };

  const updateMenuItem = async (id, itemName, itemDescription, itemCategory, itemPrice, imageUrl, available) => {
    try {
      const response = await axios.put(config.API_URL + BackendEndpoint.UpdateMenuItem, {
        menu_item_id: id,
        updated_menu_item: {
          name: itemName,
          description: itemDescription,
          imageUrl: imageUrl,
          baseCost: itemPrice,
          category: itemCategory,
          customizations: [],
          available: available,
        }
      }, {
        headers: {
          AUTH_TOKEN: cookie.accessToken,
          'Content-Type': ContentType.JSON
        }
      });
      return response.status === 200;
    } catch (e) {
      console.log(e);
      return false;
    }
  };

  const deleteMenuItem = async (id) => {
    try {
      // Michael: this will be HTTP DELETE later (Sprint 3 when we optimize BE endpoints)
      const response = await axios.post(config.API_URL + BackendEndpoint.DeleteMenuItem, {
        menu_item_id: id
      }, {
        headers: {
          AUTH_TOKEN: cookie.accessToken,
          'Content-Type': ContentType.JSON
        }
      });
      return response.status === 200;
    } catch (e) {
      console.log(e);
      return false;
    }
  };

  /*
   * metric endpoint func below:
   */
  const getMetrics = async (setResponseState, setLoadingState) => {
    try {
      const response = await axios.get(config.API_URL + BackendEndpoint.GetMetrics, {
        headers: { 'Content-Type': ContentType.JSON }
      });
      if (response !== undefined && (response.status === 200 || response.status === 201)) {
        await setResponseState(response.data);
        await setLoadingState(LoadingStages.LoadSucceeded);
      } else {
        await setResponseState(response.data);
        await setLoadingState(LoadingStages.LoadFailed);
      }
    } catch (e) {
      console.log(e);
    }
  };

  /*
   * image upload endpoint func below:
   */
  const uploadImage = async (image, imageType: UploadImageType, fileExtension = null, setResponseState = null) => {
    const formData = new FormData();
    formData.append('image', image);
    if (fileExtension) { formData.append('fileExtension', fileExtension); }
    let endpoint;
    if (imageType === UploadImageType.Item) {
      endpoint = BackendEndpoint.UploadItemImage;
    } else if (imageType === UploadImageType.Id) {
      endpoint = BackendEndpoint.UploadRecipientId;
    } else {
      console.log('How did you get here?');
    }

    try {
      // NOTE: - BackendEndpoint.UploadItemImage doesn't require AUTH_TOKEN
      //            but below won't break anything
      //       - BackendEndpoint.UploadRecipientId does require AUTH_TOKEN
      const response = await axios.post(config.API_URL + endpoint, formData, {
        headers: {
          AUTH_TOKEN: cookie.accessToken,
          'Content-Type': ContentType.FORM
        }
      });
      if (response.status === 200) {
        if (setResponseState) { 
          await setResponseState(response.data);
        }
        if (setResponseState) {
          return response.data;
        }
        else {
          return response.data.file_name;
        }
      }
      if (setResponseState) {
        await setResponseState(response.data);
      }
      return response !== undefined && response.status === 200;
    } catch (e) {
      if (setResponseState) {
        if (e.response && e.response.data) {
          await setResponseState(e.response.data);
          return e.response.data;
        }
        else {
          setResponseState(unknownResponse);
          return unknownResponse;
        }
      };
      return undefined;
    }
  };

  /*
  * payment endpoint funcs below:
  */
  const sendSquarePayment = async (data, setResponseState, setLoadingState) => {
    try {
      const response = await axios.post(config.API_URL + BackendEndpoint.GetRecipients, {
        nonce: data.nonce,
        buyerVerificationToken: data.buyerVerificationToken,
        total: data.total
      }, { headers: { 'Content-Type': ContentType.JSON } });
      if (response !== undefined && (response.status === 200 || response.status === 201)) {
        await setResponseState(response.data);
        await setLoadingState(LoadingStages.LoadSucceeded);
      } else {
        await setResponseState(response.data);
        await setLoadingState(LoadingStages.LoadFailed);
      }
    } catch (e) {
      console.log(e);
    }
  };

  /*
  * admin endpoint funcs below:
  */
  const getRecipients = async (setResponseState, setLoadingState) => {
    try {
      const response = await axios.get(config.API_URL + BackendEndpoint.GetRecipients, {
        headers: {
          AUTH_TOKEN: cookie.accessToken,
          'Content-Type': ContentType.JSON,
        }
      });
      if (response !== undefined && (response.status === 200 || response.status === 201)) {
        await setResponseState(response.data);
        await setLoadingState(LoadingStages.LoadSucceeded);
      } else {
        await setResponseState(response.data);
        await setLoadingState(LoadingStages.LoadFailed);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const updateRecipient = async (data, setResponseState, setLoadingState) => {
    try {
      const response = await axios.put(config.API_URL + BackendEndpoint.EditRecipient, {
        recipient_email: data.recipient_email,
        available_credits: data.available_credits,
        extra_credits: data.extra_credits,
        credit_limit: data.credit_limit,
        approval_status: data.approval_status
      }, {
        headers: {
          AUTH_TOKEN: cookie.accessToken,
          'Content-Type': ContentType.JSON,
        }
      });
      if (response !== undefined && (response.status === 200 || response.status === 201)) {
        await setResponseState(response.data);
        await setLoadingState(LoadingStages.LoadSucceeded);
      } else {
        await setResponseState(response.data);
        await setLoadingState(LoadingStages.LoadFailed);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const approveRecipient = async (data, setResponseState, setLoadingState) => {
    try {
      const response = await axios.put(config.API_URL + BackendEndpoint.ApproveRecipient, {
        recipient_email: data.recipient_email,
        approval_status: data.approval_status
      }, {
        headers: {
          AUTH_TOKEN: cookie.accessToken,
          'Content-Type': ContentType.JSON,
        }
      });
      if (response !== undefined && (response.status === 200 || response.status === 201)) {
        await setResponseState(response.data);
        await setLoadingState(LoadingStages.LoadSucceeded);
      } else {
        await setResponseState(response.data);
        await setLoadingState(LoadingStages.LoadFailed);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const getAdminLogs = async (setResponseState, setLoadingState) => {
    try {
      const response = await axios.get(config.API_URL + BackendEndpoint.GetAdminLogs, {
        headers: {
          AUTH_TOKEN: cookie.accessToken,
          'Content-Type': ContentType.JSON,
        }
      });
      if (response !== undefined && (response.status === 200 || response.status === 201)) {
        await setResponseState(response.data);
        await setLoadingState(LoadingStages.LoadSucceeded);
      } else {
        await setResponseState(response.data);
        await setLoadingState(LoadingStages.LoadFailed);
      }
    } catch (e) {
      console.log(e);
    }
  };

  return {
    performRemoteCall,

    // authentication
    userLogin,
    signUpCustomer,
    signUpRecipient,
    signUpDiner,
    signUpRestaurant,

    // customer
    getCustomer,
    updatePassword,
    confirmOTP,
    resetPassword,
    verifyOTP,

    // recipient
    getRecipientApprovalStatus,
    getRecipientAvailableCredits,
    getRecipientOrders,
    getRecipientResponses,
    submitRecipientResponse,

    // restaurant
    getRestaurants,
    getRestaurantData,
    cancelOrder,
    createOrder,
    completeOrder,
    getRestaurantOrders,
    getRestaurantId,

    // menu
    getMenuItems,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,

    // metric
    getMetrics,

    // image upload
    uploadImage,

    // payment
    sendSquarePayment,

    // admin
    getRecipients,
    updateRecipient,
    approveRecipient,
    getAdminLogs
  };
}

export const RemoteCallContainer = createContainer(useRemoteCallContainer);
