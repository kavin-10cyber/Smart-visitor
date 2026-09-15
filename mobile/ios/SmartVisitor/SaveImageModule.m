#import "SaveImageModule.h"
#import <Photos/Photos.h>

@implementation SaveImageModule

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

RCT_EXPORT_METHOD(saveBase64Image:(NSString *)base64Data
                  fileName:(NSString *)fileName
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  if (!base64Data || base64Data.length == 0) {
    reject(@"INVALID_DATA", @"Base64 image data is empty", nil);
    return;
  }

  NSString *cleanBase64 = base64Data;
  NSRange commaRange = [cleanBase64 rangeOfString:@","];
  if (commaRange.location != NSNotFound) {
    cleanBase64 = [cleanBase64 substringFromIndex:commaRange.location + 1];
  }

  NSData *imageData = [[NSData alloc] initWithBase64EncodedString:cleanBase64 options:NSDataBase64DecodingIgnoreUnknownCharacters];
  if (!imageData) {
    reject(@"DECODE_FAILED", @"Failed to decode base64 data into image", nil);
    return;
  }

  UIImage *image = [UIImage imageWithData:imageData];
  if (!image) {
    reject(@"INVALID_IMAGE", @"Failed to create UIImage from decoded data", nil);
    return;
  }

  // Request photo library authorization
  [PHPhotoLibrary requestAuthorization:^(PHAuthorizationStatus status) {
    if (status == PHAuthorizationStatusAuthorized || (status == 4 /* PHAuthorizationStatusLimited */)) {
      [[PHPhotoLibrary sharedPhotoLibrary] performChanges:^{
        [PHAssetChangeRequest creationRequestForAssetFromImage:image];
      } completionHandler:^(BOOL success, NSError * _Nullable error) {
        if (success) {
          resolve(@"Photos / Camera Roll");
        } else {
          // Fallback: save to app Documents folder
          NSArray *paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
          NSString *documentsDirectory = [paths firstObject];
          NSString *cleanFileName = [fileName hasSuffix:@".png"] ? fileName : [NSString stringWithFormat:@"%@.png", fileName];
          NSString *filePath = [documentsDirectory stringByAppendingPathComponent:cleanFileName];
          
          if ([imageData writeToFile:filePath atomically:YES]) {
            resolve([NSString stringWithFormat:@"Documents/%@", cleanFileName]);
          } else {
            reject(@"SAVE_FAILED", error ? error.localizedDescription : @"Failed to save image to Photos", error);
          }
        }
      }];
    } else {
      // Photo library permission not granted - fallback to Documents directory
      NSArray *paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
      NSString *documentsDirectory = [paths firstObject];
      NSString *cleanFileName = [fileName hasSuffix:@".png"] ? fileName : [NSString stringWithFormat:@"%@.png", fileName];
      NSString *filePath = [documentsDirectory stringByAppendingPathComponent:cleanFileName];
      
      if ([imageData writeToFile:filePath atomically:YES]) {
        resolve([NSString stringWithFormat:@"Documents/%@", cleanFileName]);
      } else {
        reject(@"PERMISSION_DENIED", @"Photo Library access was not granted", nil);
      }
    }
  }];
}

@end
